export interface AwsConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export function loadAwsConfig(): AwsConfig {
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
    region: process.env.AWS_REGION ?? "us-east-1",
  };
}
