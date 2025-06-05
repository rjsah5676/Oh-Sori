import mongoose from 'mongoose';

const dmMessageSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'DMRoom', required: true },
  sender: { type: String, required: true }, // email
  content: { type: String, default: '' },
  attachments: [
    {
      type: {
        type: String, // image, file 등
      },
      url: String,
      filename: String,
      size: Number,
    }
  ],
  isReadBy: [{ type: String }], // 읽은 사용자 이메일 리스트
  deletedBy: [{ type: String }], // 삭제한 사용자 이메일 리스트
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.DMMessage || mongoose.model('DMMessage', dmMessageSchema);