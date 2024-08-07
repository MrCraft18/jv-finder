import mongoose from "mongoose"
import { configDotenv } from 'dotenv'; configDotenv()


const emailSchema = new mongoose.Schema({
    email: String,
    sold: {
        type: Boolean,
        default: false
    },
    post: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    foundAt: {
        type: Date,
        default: new Date
    }
})

export default mongoose.model('Email', emailSchema)