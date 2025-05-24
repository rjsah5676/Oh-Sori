import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  nickname: { type: String, required: true },
  tag: { type: String, required: true },
  provider: { type: String, required: true }, // 'google', 'kakao', 'naver', 'local'
  password: { type: String, required: false }, // 일반 회원만 필요
  profileImage: { type: String },
  color: { type: String, default: '#ccc' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.User || mongoose.model('User', userSchema);
