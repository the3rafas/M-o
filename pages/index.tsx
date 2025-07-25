import PasswordCard from "@/component/passwordCard";
import { getAuth } from "@/lib/auth";
import { GetStaticProps } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home({ authorized }: { authorized: boolean }) {
  const [visible, setVisible] = useState(authorized);
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

export const getStaticProps = (async () => {
  const data = getAuth();
  if (!data) {
    return { props: { authorized: false } };
  }
  const lastLogInDate = new Date(data[0].lastLogInDate);
  const now = new Date();

  // Calculate difference in milliseconds
  const diffInMs = now.getTime() - lastLogInDate.getTime();

  // Convert to days
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  return { props: { authorized: diffInDays <= 3 } };
}) satisfies GetStaticProps<{
  authorized: boolean;
}>;
