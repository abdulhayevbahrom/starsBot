import Counter from "../models/counter.js";

export async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return counter.sequence;
}
