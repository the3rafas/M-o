// components/PasswordCard.tsx

import { useState } from 'react';

export default function PasswordCard({ setVisible }: { setVisible: (v: boolean) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (res.status === 200) {
        setVisible(true);
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Server error');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white text-black rounded-2xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">Enter Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg mb-4"
          placeholder="Your password"
          required
        />
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
