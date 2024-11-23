import axios, { AxiosInstance, AxiosRequestHeaders } from 'axios';
import { Config } from '../config/config';

export class Client {
    private client: AxiosInstance;

    constructor(config: Config) {
        this.client = axios.create({
            baseURL: config.endpointBaseUrl || '',
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    setHeader(key: string, value: string): void {
        this.client.defaults.headers[key] = value;
    }

    setHeaders(headers: Record<string, string>): void {
        Object.keys(headers).forEach(key => {
            this.client.defaults.headers[key] = headers[key];
        });
    }

    getClient(): AxiosInstance {
        return this.client;
    }
}
