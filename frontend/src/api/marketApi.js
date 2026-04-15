import axios from 'axios';
const client = axios.create({ baseURL: '/api/market' });
export const getMarketSummary = () => client.get('/summary').then(r => r.data);
export const getAllocations    = (capital) => client.get(`/allocate?capital=${capital}`).then(r => r.data);
