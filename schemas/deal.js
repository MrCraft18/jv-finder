import mongoose from "mongoose"
import { configDotenv } from 'dotenv'; configDotenv()

await mongoose.connect(process.env.MONGODB_URI)

const dealSchema = mongoose.Schema({
    category: String,
    author: String,
    address: {
        streetName: String,
        streetNumber: String,
        city: String,
        state: String,
        zip: String
    },
    price: Number,
    arv: Number,
    priceToARV: Number,
    associatedPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
        required: true
    },
    createdAt: Date
})

export default mongoose.model('Deal', dealSchema)