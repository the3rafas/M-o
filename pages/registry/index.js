"use client";

import { generateAndPrintReceipt } from "@/helpers/helper";
import Link from "next/link";
import React, { useEffect, useState } from "react";
export default function RegistryPage() {
  // ---------- STATE ----------
  const [entries, setEntries] = useState([]);
  const [products, setProducts] = useState([]); // to populate the “Create Bill” dropdown
  const [isLoading, setIsLoading] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState(null); // { id, date } or null
  const [errorMsg, setErrorMsg] = useState("");
  // popup open/close
  const [showBillingModal, setShowBillingModal] = useState(false);
  // optional discount value
  const [discount, setDiscount] = useState(0);
  // track which entry is currently “creating a bill”—so we can show an inline form
  // Example: { id: 2, date: "2025-06-02" } or null
  const [billingEntry, setBillingEntry] = useState(null);

  // billing form state: a map by productId → quantity
  // e.g. { 3: 2, 5: 1 }
  const [billQuantities, setBillQuantities] = useState({});

  // track if we’re submitting the “create bill” action
  const [isBilling, setIsBilling] = useState(false);

  // ---------- FETCH INITIAL DATA ----------
  useEffect(() => {
    async function fetchAll() {
      setIsLoading(true);
      setErrorMsg("");

      try {
        // 1) Fetch registry entries
        const regRes = await fetch("/api/registry");
        if (!regRes.ok) {
          throw new Error(`Failed loading registry: ${regRes.status}`);
        }
        const regData = await regRes.json();
        setEntries(regData);

        // 2) Fetch products (for billing dropdown)
        const prodRes = await fetch("/api/products");
        if (!prodRes.ok) {
          throw new Error(`Failed loading products: ${prodRes.status}`);
        }
        const prodData = await prodRes.json();
        setProducts(prodData);
      } catch (err) {
        console.error(err);
        setErrorMsg(err.message || "Error fetching data.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAll();
  }, []);

  // ---------- HANDLER: ADD A NEW ENTRY (POST) ----------
  const [form, setForm] = useState({ name: "", number: "" });

  async function handleAddEntry(e) {
    e.preventDefault();
    setErrorMsg("");

    if (!form.name.trim() || !form.number.trim()) {
      setErrorMsg("Both name and number are required.");
      return;
    }
    setIsLoading(true);

    try {
      const res = await fetch("/api/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          number: form.number.trim(),
        }),
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || `Status ${res.status}`);
      }
      const newEntry = await res.json();
      setEntries((prev) => [...prev, newEntry]);
      setForm({ name: "", number: "" });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to add entry.");
    } finally {
      setIsLoading(false);
    }
  }

  // ---------- HANDLER: DELETE AN ENTRY ----------
  async function handleDelete(id, date) {
    setErrorMsg("");
    setDeletingEntry({ id, date });
    try {
      const res = await fetch("/api/registry", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, date }),
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || `Status ${res.status}`);
      }
      setEntries((prev) =>
        prev.filter((e) => !(e.id === id && e.date === date))
      );
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || `Failed to delete entry id=${id}.`);
    } finally {
      setDeletingEntry(null);
    }
  }

  // ---------- HANDLER: PUT ENTRY ON HOLD ----------
  async function handleHold(id, date) {
    setErrorMsg("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/registry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, date, action: "hold" }),
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || `Status ${res.status}`);
      }
      const updated = await res.json();
      setEntries((prev) =>
        prev.map((e) => (e.id === id && e.date === date ? updated : e))
      );
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to put on hold.");
    } finally {
      setIsLoading(false);
    }
  }

  // ---------- HANDLER: CREATE BILL ----------
  async function handleCreateBillSubmit(e) {
    e.preventDefault();
    if (!billingEntry) return;

    const { id, date } = billingEntry;
    // Build billItems array: only those productIds where quantity > 0
    const billItems = [];
    for (const [prodIdStr, qty] of Object.entries(billQuantities)) {
      const productId = parseInt(prodIdStr, 10);
      if (qty > 0) {
        billItems.push({ productId, quantity: qty });
      }
    }
    if (billItems.length === 0) {
      setErrorMsg("Select at least one product with quantity > 0.");
      return;
    }

    setIsBilling(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/registry", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          date,
          action: "createBill",
          billItems,
        }),
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || `Status ${res.status}`);
      }
      const updated = await res.json();
      setEntries((prev) => prev.filter((f) => f.id !== id));
      setBillingEntry(null);
      // close modal & print
      closeBillingForm();
      generateAndPrintReceipt(updated);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to create bill.");
    } finally {
      setIsBilling(false);
    }
  }

  // Helper: toggle “Create Bill” form
  function openBillingForm(entry) {
    setErrorMsg("");
    setBillingEntry(entry);
    setBillQuantities({});
    setDiscount(0);
    setShowBillingModal(true);
  }
  function closeBillingForm() {
    setBillingEntry(null);
    setBillQuantities({});
    setDiscount(0);
    setShowBillingModal(false);
  }
  // subtotal is price * 1 for each selected product
  const subtotal = Object.keys(billQuantities).reduce((sum, prodIdStr) => {
    const prod = products.find((p) => p.id === +prodIdStr);
    return prod ? sum + prod.price : sum;
  }, 0);

  const total = Math.max(0, subtotal - discount);
  // ---------- RENDER ----------
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      {/* Navigation */}
      <nav className="mb-8">
        <Link
          href="/"
          className="inline-block text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Home
        </Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link
          href="/products"
          className="inline-block text-blue-600 hover:text-blue-800 font-medium"
        >
          Manage Products
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-800 mb-4">
            Registry
          </h1>
          <p className="text-gray-600 mb-4">
            Add a new entry or manage existing entries. Each day, IDs reset to
            1.
          </p>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-4 rounded bg-red-100 border border-red-300 px-4 py-3 text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Add New Entry Form */}
          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleAddEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={isLoading || deletingEntry !== null}
                  className="block w-full border text-black border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number
                </label>
                <input
                  type="text"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                  disabled={isLoading || deletingEntry !== null}
                  className="block w-full border text-black border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter contact or ID"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || deletingEntry !== null}
                className={`w-full inline-flex justify-center items-center rounded-md py-2 px-4 text-white font-medium 
                  ${
                    isLoading
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    ></path>
                  </svg>
                ) : (
                  "Add Entry"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Entries Table */}
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  ID (Today)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Number
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Date
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 whitespace-nowrap text-center text-gray-500"
                  >
                    No registry entries yet.
                  </td>
                </tr>
              ) : (
                entries.map((e, idx) => {
                  const isDeleting =
                    deletingEntry !== null &&
                    deletingEntry.id === e.id &&
                    deletingEntry.date === e.date;

                  const isBillingThis =
                    billingEntry !== null &&
                    billingEntry.id === e.id &&
                    billingEntry.date === e.date;

                  return (
                    <React.Fragment key={`${e.date}-${e.id}-${idx}`}>
                      <tr className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {e.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {e.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {e.number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {e.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center space-x-2">
                          {/* If still pending/on-hold, show “Hold” & “Create Bill” */}
                          {e.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleHold(e.id, e.date)}
                                disabled={isLoading || isDeleting}
                                className={`inline-flex items-center px-3 py-1 text-xs font-medium border rounded-md
                                  ${
                                    isLoading
                                      ? "bg-gray-300 border-gray-300 text-gray-600 cursor-not-allowed"
                                      : "bg-gray-100 border-gray-400 text-gray-800 hover:bg-gray-200"
                                  }`}
                              >
                                {isLoading ? "…" : "Hold"}
                              </button>
                            </>
                          )}
                          {e.status === "on-hold" && (
                            <>
                              <button
                                onClick={() => openBillingForm(e)}
                                disabled={isLoading || isDeleting}
                                className={`inline-flex items-center px-3 py-1 text-xs font-medium border rounded-md
                                  ${
                                    isLoading
                                      ? "bg-blue-300 border-blue-300 text-white cursor-not-allowed"
                                      : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700"
                                  }`}
                              >
                                Create Bill
                              </button>
                            </>
                          )}

                          {/* If already done, show “Delete” only */}
                          {e.status === "done" && (
                            <button
                              onClick={() => handleDelete(e.id, e.date)}
                              disabled={isDeleting || isLoading}
                              className={`inline-flex items-center px-3 py-1 text-xs font-medium border rounded-md
                                ${
                                  isDeleting
                                    ? "bg-red-300 border-red-300 text-white cursor-not-allowed"
                                    : "bg-red-500 border-red-500 text-white hover:bg-red-600"
                                }`}
                            >
                              {isDeleting ? "…" : "Delete"}
                            </button>
                          )}

                          {/* If not “done” but still can delete (you might want to allow deletion anytime) */}
                          {(e.status === "pending" ||
                            e.status === "on-hold") && (
                            <button
                              onClick={() => handleDelete(e.id, e.date)}
                              disabled={isDeleting || isLoading}
                              className={`inline-flex items-center px-3 py-1 text-xs font-medium border rounded-md
                                ${
                                  isDeleting
                                    ? "bg-red-300 border-red-300 text-white cursor-not-allowed"
                                    : "bg-red-500 border-red-500 text-white hover:bg-red-600"
                                }`}
                            >
                              {isDeleting ? "…" : "Delete"}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* ── BILLING ROW (if user clicked “Create Bill” on this entry) ── */}
                      {isBillingThis && e.status !== "done" && (
                        <tr className="bg-gray-100">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="bg-white shadow rounded-lg p-4">
                              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                                Create Bill for #{e.id} ({e.name})
                              </h3>
                              <form
                                onSubmit={handleCreateBillSubmit}
                                className="space-y-4"
                              >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {products.map((prod) => (
                                    <div
                                      key={prod.id}
                                      className="flex items-center space-x-2"
                                    >
                                      <input
                                        type="checkbox"
                                        id={`prod-${e.id}-${prod.id}`}
                                        onChange={(ev) => {
                                          const checked = ev.target.checked;
                                          setBillQuantities((prev) => {
                                            const copy = { ...prev };
                                            if (checked) {
                                              copy[prod.id] =
                                                copy[prod.id] || 1;
                                            } else {
                                              delete copy[prod.id];
                                            }
                                            return copy;
                                          });
                                        }}
                                        disabled={isBilling}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <label
                                        htmlFor={`prod-${e.id}-${prod.id}`}
                                        className="flex-1 text-sm text-gray-800"
                                      >
                                        {prod.name} (${prod.price.toFixed(2)})
                                      </label>
                                      {billQuantities[prod.id] !==
                                        undefined && (
                                        <input
                                          type="number"
                                          min="1"
                                          step="1"
                                          value={billQuantities[prod.id]}
                                          onChange={(ev) => {
                                            const val = parseInt(
                                              ev.target.value,
                                              10
                                            );
                                            setBillQuantities((prev) => ({
                                              ...prev,
                                              [prod.id]:
                                                isNaN(val) || val < 1 ? 1 : val,
                                            }));
                                          }}
                                          disabled={isBilling}
                                          className="w-16 border border-gray-300 rounded-md px-2 py-1 text-sm"
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>

                                <div className="flex items-center space-x-4 mt-4">
                                  <button
                                    type="submit"
                                    disabled={isBilling}
                                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white
                                      ${
                                        isBilling
                                          ? "bg-blue-300 cursor-not-allowed"
                                          : "bg-blue-600 hover:bg-blue-700"
                                      }`}
                                  >
                                    {isBilling ? (
                                      <svg
                                        className="animate-spin h-5 w-5 text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                      >
                                        <circle
                                          className="opacity-25"
                                          cx="12"
                                          cy="12"
                                          r="10"
                                          stroke="currentColor"
                                          strokeWidth="4"
                                        ></circle>
                                        <path
                                          className="opacity-75"
                                          fill="currentColor"
                                          d="M4 12a8 8 0 018-8v8H4z"
                                        ></path>
                                      </svg>
                                    ) : (
                                      "Save Bill"
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={closeBillingForm}
                                    disabled={isBilling}
                                    className="px-4 py-2 text-sm font-medium rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showBillingModal && billingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
            {/* Close button */}
            <button
              onClick={closeBillingForm}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl"
            >
              &times;
            </button>

            <h2 className="text-xl font-semibold mb-4">
              Create Bill for #{billingEntry.id} ({billingEntry.name})
            </h2>

            <form onSubmit={handleCreateBillSubmit} className="space-y-4">
              {/* ▶️ Product selectors (no quantity input) */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {products.map((prod) => (
                  <div key={prod.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`prod-${prod.id}`}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setBillQuantities((prev) => {
                          const copy = { ...prev };
                          if (checked)
                            copy[prod.id] = 1; // always 1 per checked
                          else delete copy[prod.id];
                          return copy;
                        });
                      }}
                      disabled={isBilling}
                      className="h-4 w-4"
                    />
                    <label
                      htmlFor={`prod-${prod.id}`}
                      className="flex-1 text-sm"
                    >
                      {prod.name} (EGP{prod.price.toFixed(2)})
                    </label>
                  </div>
                ))}
              </div>

              {/* ▶️ Discount */}
              <div className="flex items-center space-x-2">
                <label htmlFor="discount" className="font-medium">
                  Discount:
                </label>
                <input
                  id="discount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  disabled={isBilling}
                  className="w-24 border rounded px-2 py-1 text-sm"
                />
              </div>

              {/* ▶️ Live totals */}
              <div className="pt-2 border-t">
                <p className="text-sm">Subtotal: EGP {subtotal.toFixed(2)}</p>
                <p className="text-lg font-semibold">
                  Total: EGP {total.toFixed(2)}
                </p>
              </div>

              {/* ▶️ Actions */}
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={closeBillingForm}
                  disabled={isBilling}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBilling}
                  className={`px-4 py-2 rounded text-white ${
                    isBilling ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isBilling ? "Saving..." : "Save & Print"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
