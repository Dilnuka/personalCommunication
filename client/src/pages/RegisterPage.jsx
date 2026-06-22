import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout, { AuthInput, AuthButton, AuthFooter, AuthError } from '../components/AuthLayout';
import Avatar from '../components/Avatar';
import AvatarPicker from '../components/AvatarPicker';
import { randomAvatarId } from '../constants/avatars';

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
  });
  const [avatarId, setAvatarId] = useState(() => randomAvatarId());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ ...form, avatarId });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Join and start connecting with people" wide>
      <AuthError message={error} />
      <div className="mb-6 p-4 rounded-2xl bg-[#0f172a]/60 border border-slate-700/40">
        <div className="flex items-center gap-4 mb-4">
          <Avatar
            name={form.displayName || form.username || 'You'}
            avatarId={avatarId}
            size="xl"
          />
          <div>
            <p className="text-sm font-medium text-white">Choose your avatar</p>
            <p className="text-xs text-slate-400">Pick a profile picture for your account</p>
          </div>
        </div>
        <AvatarPicker value={avatarId} onChange={setAvatarId} />
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Username"
          value={form.username}
          onChange={update('username')}
          placeholder="Choose a username"
          required
        />
        <AuthInput
          label="Display name"
          value={form.displayName}
          onChange={update('displayName')}
          placeholder="How others will see you"
        />
        <AuthInput
          label="Email"
          type="email"
          value={form.email}
          onChange={update('email')}
          placeholder="your@email.com"
          required
        />
        <AuthInput
          label="Password"
          type="password"
          value={form.password}
          onChange={update('password')}
          placeholder="At least 6 characters"
          required
        />
        <AuthButton loading={loading}>Create account</AuthButton>
      </form>
      <AuthFooter text="Already have an account?" linkText="Sign in" to="/login" />
    </AuthLayout>
  );
}
