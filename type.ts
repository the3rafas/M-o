type BillItems = {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
};
export type Registry = {
  id: number;
  name: string;
  number: string;
  date: string;
  status: string;
  billItems: BillItems[];
  totalPrice: number;
};
export type Product = {
  id: number;
  name: string;
  price: number;
};
