import { QueryDocumentSnapshot, Timestamp } from '@angular/fire/firestore';

import { v4 as uuidv4 } from 'uuid';
import { Variation } from './variation';
import { ShippingInfo } from './shipping';
import { OrderItems } from './transaction/order_items';

export interface Products {
  id: string;
  images: string[];
  name: string;
  description: string;
  category: string;
  cost: number;
  price: number;
  stocks: number;
  variations: Variation[];
  expiryDate: Date;
  reviews: [];
  shippingInformation: ShippingInfo;
  featured: boolean;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date | null;
}

export const productConverter = {
  toFirestore: (data: Products) => {
    const convertedData: Products = { ...data };

    if (convertedData.createdAt instanceof Date) {
      convertedData.createdAt = new Date(convertedData.createdAt);
    }

    return { ...convertedData };
  },
  fromFirestore: (snap: QueryDocumentSnapshot) => {
    const data = snap.data() as Products;

    // Convert Firestore Timestamps to JavaScript Dates
    if (data.expiryDate instanceof Timestamp) {
      data.expiryDate = data.expiryDate.toDate();
    }

    if (data.createdAt instanceof Timestamp) {
      data.createdAt = data.createdAt.toDate();
    }

    if (data.updatedAt instanceof Timestamp) {
      data.updatedAt = data.updatedAt.toDate();
    }

    return data;
  },
};

// export interface Variation {
//   id: string;
//   name: string;
//   image: string;
//   cost: number;
//   price: number;
//   stocks: number;
// }

export function productToOrder(product: Products): Order[] {
  let orderList: Order[] = [];
  if (product.variations.length == 0) {
    orderList.push({
      productID: product.id,
      name: product.name,
      category: product.category,
      isVariation: false,
      variatioID: '',
      image: product.images[0],
      cost: product.cost,
      price: product.price,
      expiration: product.expiryDate,
      quantity: 1,
      stocks: product.stocks,
      shippingInfo: product.shippingInformation,
    });
  } else {
    product.variations.forEach((variation) => {
      orderList.push({
        productID: product.id,
        name: `${product.name} 
        ${variation.name}`,
        category: product.category,
        isVariation: true,
        variatioID: variation.id,
        image: variation.image,
        expiration: product.expiryDate,
        cost: variation.cost,
        price: variation.price,
        quantity: 1,
        stocks: variation.stocks,
        shippingInfo: product.shippingInformation,
      });
    });
  }
  return orderList;
}

export interface Order {
  productID: string;
  name: string;
  category: string;
  isVariation: boolean;
  variatioID: string;
  image: string;
  cost: number;
  price: number;
  expiration: Date;
  quantity: number;
  stocks: number;
  shippingInfo: ShippingInfo;
}
