"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function HistoryPage() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function fetchHistory() {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch("/api/registry?status=done");
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        setEntries(data);
      } catch (err) {
        setErrorMsg(err.message || "Failed to load history.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const filtered = entries.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase().trimEnd()) ||
      e.number.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <nav className="mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          ← Home
        </Link>
      </nav>
      <div className="max-w-4xl mx-auto space-y-4 text-black">
        <h1 className="text-2xl font-semibold">Registry History</h1>
        <div>
          <input
            type="text"
            placeholder="Search by name or number"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.trimStart())}
            className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4"
          />
        </div>
        {errorMsg && <div className="text-red-600">{errorMsg}</div>}
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No entries found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((e, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {e.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {e.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {e.number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {e.date}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {e.status === "pending" && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                        {e.status === "on-hold" && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-200 text-gray-800">
                            On Hold
                          </span>
                        )}
                        {e.status === "done" && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Done
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        EGP {e.totalPrice?.toFixed(2) || "0.00"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
