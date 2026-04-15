import axios from 'axios';

const client = axios.create({ baseURL: '/api/binance' });

export async function getPrices() {
  const { data } = await client.get('/prices');
  return data;
}

export async function getDual() {
  const { data } = await client.get('/dual');
  return data;
}
