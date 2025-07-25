import { Product } from "@/type";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<{ name: string; price: string }>({
    name: "",
    price: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Fetch existing products
  useEffect(() => {
    async function fetchProducts() {
      setIsLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch("/api/products");
        if (!res.ok) {
          throw new Error(`Failed to load: ${res.status}`);
        }
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error(err);
        setErrorMsg("Could not fetch products.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Handle form submission
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");

    const priceNum = parseFloat(form.price);
    if (!form.name.trim() || isNaN(priceNum)) {
      setErrorMsg("Both name and valid price are required.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), price: priceNum }),
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || `Status ${res.status}`);
      }
      const newProduct = await res.json();
      setProducts((prev) => [...prev, newProduct]);
      setForm({ name: "", price: "" });
    } catch (err) {
      console.error(err);
      setErrorMsg(
        (err as { message: string }).message || "Failed to add product."
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Handle deletion of a product by id
  async function handleDelete(id: number) {
    setErrorMsg("");
    setDeletingId(id);
    try {
      const res = await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || `Status ${res.status}`);
      }
      // On success, remove from local state
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      setErrorMsg(
        (err as { message: string }).message ||
          `Failed to delete product id=${id}.`
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <nav className="mb-8">
        <Link
          href="/"
          className="inline-block text-blue-600 hover:text-blue-800 font-medium"
        >
          ← Home
        </Link>
        <span className="mx-2 text-gray-400">|</span>
        <Link
          href="/registry"
          className="inline-block text-blue-600 hover:text-blue-800 font-medium"
        >
          Registry
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-800 mb-4">Products</h1>
        <p className="text-gray-600 mb-6">
          Add new products (name + price) or manage existing products below.
        </p>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-4 rounded bg-red-100 border border-red-300 px-4 py-3 text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={isLoading || deletingId !== null}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                placeholder="Enter product name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price (EGP)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                disabled={isLoading || deletingId !== null}
                className="block w-full border text-black border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter price"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || deletingId !== null}
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
                "Add Product"
              )}
            </button>
          </form>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto bg-white shadow rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                >
                  ID
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
                  Price (EGP)
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
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 whitespace-nowrap text-center text-gray-500"
                  >
                    No products yet.
                  </td>
                </tr>
              ) : (
                products.map((p, idx) => (
                  <tr
                    key={p.id}
                    className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {p.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {p.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      EGP {p.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={deletingId !== null}
                        className={`inline-flex items-center px-3 py-1 border border-red-500 rounded-md text-sm font-medium
                          ${
                            deletingId === p.id
                              ? "bg-red-300 cursor-not-allowed"
                              : "bg-red-500 text-white hover:bg-red-600"
                          }`}
                      >
                        {deletingId === p.id ? (
                          <svg
                            className="animate-spin h-4 w-4 text-white"
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
                          "Delete"
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// export const getStaticProps = (async () => {
//   const productsData = getAllProducts();

//   return { props: { productsData } };
// }) satisfies GetStaticProps<{
//   productsData: Product[];
// }>;
