import { Client } from '../client';
import { UploadRequest, UploadResponse } from '../../entity/file';

export class UploadService {
    private client: Client;

    constructor(client: Client) {
        this.client = client;
    }

    async uploadProfilePicture(fileName: string, base64Image: string, contentType: string): Promise<UploadResponse> {
        const uploadRequest: UploadRequest = {
            file_name: fileName,
            file_content: base64Image,
        };

        console.log('Upload request payload:', uploadRequest);

        try {
            const response = await this.client.getClient().post<UploadResponse>('/upload', uploadRequest, {
                headers: {
                    'x-file-content-type': contentType,
                },
            });

            if (response.status >= 200 && response.status < 300) {
                return response.data;
            } else {
                throw new Error(`Upload API returned status ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('UploadService Error:', error);
            throw new Error(`Failed to call upload API: ${JSON.stringify(uploadRequest)} - ${error}`);
        }
    }

}
