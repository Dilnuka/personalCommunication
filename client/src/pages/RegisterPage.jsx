import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout, { AuthInput, AuthButton, AuthFooter, AuthError } from '../components/AuthLayout';

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
  });
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
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create account" subtitle="Join and start connecting with people">
      <AuthError message={error} />
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
