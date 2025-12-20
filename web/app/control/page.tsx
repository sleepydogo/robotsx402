'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ControlPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to robots page if accessing /control without robot ID
    router.push('/robots');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to robots...</p>
      </div>
    </div>
  );
}
