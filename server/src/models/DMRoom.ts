import mongoose from 'mongoose';

const DMRoomSchema = new mongoose.Schema({
  participants: {
    type: [String], // 이메일 배열
    required: true,
    validate: (v: string[]) => v.length === 2,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.DMRoom || mongoose.model('DMRoom', DMRoomSchema);
