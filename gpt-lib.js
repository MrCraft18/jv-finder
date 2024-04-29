import OpenAI from 'openai'
import fs from 'fs'
import { config } from 'dotenv'
config()


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})



const gpt = {
    posts: async (functionName, post) => {
        // console.log('Calling GPT Post Logic')

        const messages = [
            {
                role: 'system',
                content: fs.readFileSync(`./gpt-functions/posts/${functionName}/system-prompt.txt`, 'utf-8')
            },
            {
                role: 'user',
                content: post.text
            }
        ]

        // console.log(messages)

        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages,
            temperature: 0,
            response_format: {
                type: 'json_object'
            }
        })

        // console.log(JSON.parse(response.choices[0].message.content))

        return JSON.parse(response.choices[0].message.content)
    }
}

export default gpt