const EXPORT_DB_NAME = "GucGuy-exports";
const EXPORT_STORE_NAME = "files";

function openExportDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(EXPORT_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(EXPORT_STORE_NAME)) database.createObjectStore(EXPORT_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open export storage"));
  });
}

async function takeExportBlob(key) {
  const database = await openExportDatabase();
  const blob = await new Promise((resolve, reject) => {
    const transaction = database.transaction(EXPORT_STORE_NAME, "readonly");
    const request = transaction.objectStore(EXPORT_STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not read export file"));
  });
  database.close();
  return blob;
}

async function deleteExportBlob(key) {
  const database = await openExportDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(EXPORT_STORE_NAME, "readwrite");
    transaction.objectStore(EXPORT_STORE_NAME).delete(key);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("Could not clean export storage"));
  });
  database.close();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "BB_DOWNLOAD_BLOB") return false;
  (async () => {
    const blob = await takeExportBlob(message.key);
    if (!(blob instanceof Blob) || !blob.size) throw new Error("Stored export file is missing or empty");
    const url = URL.createObjectURL(blob);
    setTimeout(() => {
      URL.revokeObjectURL(url);
      deleteExportBlob(message.key).catch(console.error);
    }, 60000);
    sendResponse({ ok: true, url });
  })().catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
