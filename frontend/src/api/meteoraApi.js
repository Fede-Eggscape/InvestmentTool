import axios from 'axios';

const client = axios.create({ baseURL: '/api/meteora' });

export async function getCombined() {
  const { data } = await client.get('/combined');
  return data;
}
