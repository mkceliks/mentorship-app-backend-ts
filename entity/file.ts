export interface File {
    key: string;
    size: number;
}

export interface UploadRequest {
    file_name: string;
    file_content: string;
}

export interface UploadResponse {
    file_url: string;
}
