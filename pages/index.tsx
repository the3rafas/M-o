import PasswordCard from "@/component/passwordCard";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { useEffect, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [visible, setVisible] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  useEffect(() => {
    async function getData() {
      try {
        const deviceId = localStorage.getItem("deviceId");
        
        if (deviceId) {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth?q=${deviceId}`
          );

          setVisible(res.status === 200);
        }
      } catch (err) {
        console.error("Auth check failed", err);
      } finally {
        setIsChecking(false);
      }
    }
    getData();
  }, []);
  if (isChecking) {
    return (
      <div className="text-center mt-20 text-gray-600">Checking access...</div>
    );
  }

  if (!visible) {
    return (
      <>
        <PasswordCard setVisible={setVisible} />
      </>
    );
  }
  return (
    <div
      className={`${geistSans.className} ${geistMono.className} min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8`}
    >
      <div className="max-w-md w-full space-y-8">
        <h1 className="text-4xl font-extrabold text-gray-800 text-center">
          CR7 System
        </h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Quick access to manage products and registry entries.
        </p>
        <div className="mt-8 space-y-4">
          <Link
            href="/products"
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Manage Products
          </Link>
          <Link
            href="/registry"
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700"
          >
            Registry Entries
          </Link>
          <Link
            href="/history"
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gray-600 hover:bg-gray-700"
          >
            History
          </Link>
        </div>
      </div>
    </div>
  );
}
