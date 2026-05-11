// File ini mendefinisikan fetcher dan konfigurasi SWR global. Dipakai provider aplikasi agar perilaku cache dan retry konsisten.
import type { SWRConfiguration } from "swr";

// fetcher global mengubah response non-2xx menjadi error. SWR memakai error ini untuk retry dan state error panel.
export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Fetch failed");
  return response.json() as Promise<T>;
};

// swrConfig mematikan revalidate on focus agar dashboard tidak mendadak reload data saat operator berpindah tab. Retry dibatasi 3 kali untuk menghindari spam API.
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: false,
  errorRetryCount: 3,
  dedupingInterval: 2000
};
