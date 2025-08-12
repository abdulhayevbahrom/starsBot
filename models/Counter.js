// const { Schema, model } = require("mongoose");

import { Schema, model } from "mongoose";

const counterSchema = new Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

// module.exports = model("Counter", counterSchema);
const Counter = model("Counter", counterSchema);

export default Counter;
