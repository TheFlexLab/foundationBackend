const mongoose = require("mongoose");
const PostSchema = require("../models/UserList");

// Define the schema for objects within the postData array
const responseDataSchema = mongoose.Schema({
    responsingUserUuid: { type: String, required: true, },
    response: { type: Array, required: true, },
    addedAnswer: { type: String, default: "", },
    startStatus: { type: String, required: true, },
    createdAt: { type: String, default: () => new Date().toISOString(), },
    updatedAt: { type: String, default: () => new Date().toISOString(), },
    deletedAt: { type: String, default: null, },
    isActive: { type: Boolean, default: true, },
})

// Define the schema for objects of postDataWrap 
const postDataSchema = mongoose.Schema({
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
        required: true
    },
    responseData: {
        type: [responseDataSchema],
        default: [],
    },
    createdAt: { type: String, default: () => new Date().toISOString(), },
    updatedAt: { type: String, default: () => new Date().toISOString(), },
    deletedAt: { type: String, default: null, },
    isActive: { type: Boolean, default: true, },
})

// Export all schemas as properties of an object
module.exports = {
    ResponseDataSchema: mongoose.model("ResponseData", responseDataSchema),
    PostDataSchema: mongoose.model("PostData", postDataSchema),
};