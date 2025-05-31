import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: { type: String, required: true },
  context: { type: String, required: true },
});

export default mongoose.models.Post || mongoose.model('Post', postSchema);