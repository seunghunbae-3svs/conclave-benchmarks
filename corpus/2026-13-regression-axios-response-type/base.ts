import axios from "axios";

export async function downloadFile(url: string): Promise<Buffer> {
  const res = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
  return Buffer.from(res.data);
}
