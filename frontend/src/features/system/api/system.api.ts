import axios from "axios";

type HealthResponse = {
  success: true;
  data: { status: string; service: string };
};

export async function getApiHealth() {
  const origin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000";
  const response = await axios.get<HealthResponse>(`${origin}/health`, {
    timeout: 4_000,
  });
  return response.data.data;
}
