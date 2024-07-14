import OpenAI from 'openai'
import fs from 'fs'
import * as fuzz from 'fuzzball'
import { interpreter as py } from 'node-calls-python'
import axios from 'axios'
import Email from './email.js'
import Deal from './deal.js'
import mongoose from 'mongoose'
import { MongoClient, ObjectId } from 'mongodb'
import { configDotenv } from 'dotenv'; configDotenv()



const databaseClient = new MongoClient(process.env.MONGODB_URI)
const groupsCollection = databaseClient.db('JVF').collection('groups')

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

py.addImportPath(process.env.PYTHON_INTERPRETER_PATH)

const predictCategoriesPyModule = await py.import('./py/predict_categories.py')

await mongoose.connect(process.env.MONGODB_URI)



const postSchema = new mongoose.Schema({
    text: String,
    translaion: String,
    comments: {
        type: [Object],
        default: undefined
    },
    createdAt: Date,
    images: {
        type: [String],
        default: undefined
    },
    id: String,
    group: {
        name: String,
        id: String
    },
    author: {
        name: String,
        id: String
    },
    attachedPost: {
        text: String,
        images: {
            type: [String],
            default: undefined
        },
        timestamp: Date,
        translaion: String,
        author: {
            name: String,
            id: String
        }
    },
    metadata: {
        category: {
            definitiveResult: String,
            predictedResult: String,
            probabilities: Object,
            highConfidence: Boolean
        },
        includesMultipleDeals: Boolean,
        associatedDeal: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Deal'
        },
        duplicatePosts: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: 'Post',
            default: undefined
        },
        duplicateOf: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post'
        },
        extractedInfo: Object,
        foundAt: {
            type: Date,
            default: new Date()
        },
        checkedForEmails: {
            type: Boolean,
            default: false
        }
    }
})

postSchema.methods.allText = function() {
    return `${this.text || ''}${this.attachedPost?.text ? `\n${this.attachedPost.text}` : ''}`
}

postSchema.methods.checkIfDupilcate = async function () {
    const postsCursor = this.model('Post').find({ 'metadata.associatedDeal': { $exists: true } }, { text: 1, 'attachedPost.text': 1, 'metadata.associatedDeal': 1, 'metadata.duplicatePosts': 1 }).cursor()

    const ratios = []

    for await (const post of postsCursor) {
        const postText = `${post.text || ''}${post.attachedPost?.text ? `\n${post.attachedPost.text}` : ''}`
        const similarity = fuzz.ratio(this.allText(), postText)

        ratios.push(similarity)

        if (similarity > 90) {
            // console.log(similarity)

            if (post.duplicatePosts) {
                post.metadata.duplicatePosts.push(this._id)
            } else {
                post.metadata.duplicatePosts = [this._id]
            }

            await post.save()

            this.metadata.duplicateOf = post._id

            return true
        }
    }

    // console.log(Math.max(...ratios))

    return false
}

postSchema.methods.getDeal = async function() {
    //Get Predicted Category
    const predictionResult = await py.call(predictCategoriesPyModule, 'predict_post_categories', [this.allText()]).then(results => results[0])

    this.metadata.category.confidenceValue = Math.max(...Object.values(predictionResult.probabilities))

    this.metadata.category.predictedResult = predictionResult.category
    this.metadata.category.probabilities = predictionResult.probabilities

    if (this.metadata.category.predictedResult === 'None') return

    //If Category is Deal then check with GPT if post includes multiple Deals
    const includesMultipleDeals = await promptGPT(fs.readFileSync('./gpt-prompts/includesMultipleDeals.txt', 'utf-8'), this.allText()).then(response => response.result)

    //If it does include multiple Deals then mark it as such and return.
    if (includesMultipleDeals) return this.metadata.includesMultipleDeals = true

    //Extract info with GPT

    this.metadata.extractedInfo = await promptGPT(fs.readFileSync('./gpt-prompts/extractData.txt', 'utf-8'), this.allText())

    // //Street Number
    // this.metadata.extractedInfo.streetNumber = await promptGPT(fs.readFileSync('./gpt-prompts/extractStreetNumber.txt', 'utf-8'), this.allText()).then(response => response.result)

    // //Street Name
    // this.metadata.extractedInfo.streetName = await promptGPT(fs.readFileSync('./gpt-prompts/extractStreetName.txt', 'utf-8'), this.allText()).then(response => response.result)

    // //City
    // this.metadata.extractedInfo.city = await promptGPT(fs.readFileSync('./gpt-prompts/extractCity.txt', 'utf-8'), this.allText()).then(response => response.result)

    // //State
    // this.metadata.extractedInfo.state = await promptGPT(fs.readFileSync('./gpt-prompts/extractState.txt', 'utf-8'), this.allText()).then(response => response.result)

    // //Zip
    // this.metadata.extractedInfo.zip = await promptGPT(fs.readFileSync('./gpt-prompts/extractZip.txt', 'utf-8'), this.allText()).then(response => response.result)

    // //Price
    // this.metadata.extractedInfo.price = await promptGPT(fs.readFileSync('./gpt-prompts/extractPrice.txt', 'utf-8'), this.allText()).then(response => response.result)

    // //ARV (If SFH)
    // if (this.metadata.category.predictedResult === 'SFH Deal') {
    //     this.metadata.extractedInfo.arv = await promptGPT(fs.readFileSync('./gpt-prompts/extractARV.txt', 'utf-8'), this.allText()).then(response => response.result)
    // } else {
    //     this.metadata.extractedInfo.arv = null
    // }

    if (this.metadata.extractedInfo.zip && !this.metadata.extractedInfo.state) {
        const zipSearch = await axios.get(`http://api.zippopotam.us/us/${this.metadata.extractedInfo.zip}`).then(response => response.data)

        this.metadata.extractedInfo.state = zipSearch.places[0]['state abbreviation']
        this.metadata.extractedInfo.city = zipSearch.places[0]['place name']
    }

    if (!this.metadata.extractedInfo.zip && !this.metadata.extractedInfo.state) {
        const group = await groupsCollection.findOne({id: this.group.id})
        this.metadata.extractedInfo.state = group.impliedState
    }

    const deal = new Deal({
        category: this.metadata.category.predictedResult,
        author: this.author.name,
        address: {
            streetNumber: this.metadata.extractedInfo.streetNumber,
            streetName: this.metadata.extractedInfo.streetName,
            city: this.metadata.extractedInfo.city,
            state: this.metadata.extractedInfo.state,
            zip: this.metadata.extractedInfo.zip,
        },
        price: this.metadata.extractedInfo.price,
        arv: this.metadata.category.predictedResult != 'Land Deal' ? this.metadata.extractedInfo.arv : undefined,
        priceToARV: this.metadata.extractedInfo.price && this.metadata.extractedInfo.arv ? this.metadata.extractedInfo.price / this.metadata.extractedInfo.arv : undefined,
        associatedPost: this._id,
        createdAt: this.createdAt
    })

    this.metadata.associatedDeal = deal._id

    await deal.save()
}

postSchema.methods.extractEmails = async function() {
    let searchText = this.allText()

    if (this.comments) {
        this.comments.forEach(comment => {
            searchText += `\n${comment.text}`

            processReplies(comment.replies)

            function processReplies(replies) {
                replies.forEach(reply => {
                    searchText += `\n${reply.text}`

                    processReplies(reply.replies)
                })
            }
        })
    }

    const emails = new Set(searchText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g) || [])

    for (const email of emails) {
        const existingEmailDoc = await Email.findOne({ email })

        if (!existingEmailDoc) {
            new Email({
                email,
                post: this._id
            })
        }
    }
}

export default mongoose.model('Post', postSchema)




async function promptGPT(systemPrompt, userPrompt) {
    return await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: 'system',
                content: systemPrompt
            },
            {
                role: 'user',
                content: userPrompt
            }
        ],
        temperature: 0,
        response_format: {
            type: 'json_object'
        }
    })
    .then(response => JSON.parse(response.choices[0].message.content))
}