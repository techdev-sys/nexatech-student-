import client from './client';

export const getInvoices = (params) => client.get('/invoices', { params });
export const getInvoice  = (id)     => client.get(`/invoices/${id}`);
export const deleteInvoice = (id)   => client.delete(`/invoices/${id}`);
export const generateInvoices = (data) => client.post('/invoices/generate', data);
export const initiatePayment  = (data) => client.post('/transactions/initiate', data);
export const getTransactions  = (params) => client.get('/transactions', { params });
