// Simulate the listPackages function logic
async function test() {
  const baseUrl = "https://api.shimbawifi.xyz";
  try {
    const resp = await fetch(baseUrl + "/api/packages", {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!resp.ok) throw new Error(String(resp.status));
    const json = await resp.json();
    console.log("API response:", JSON.stringify(json, null, 2));
    console.log("---");
    if (json && typeof json === "object" && json.success === true && Array.isArray(json.data)) {
      console.log("Extracted data (array):", json.data);
      console.log("Package 0 price:", json.data[0].price);
      console.log("Package 0 price type:", typeof json.data[0].price);
    } else {
      console.log("Failed to extract data");
    }
  } catch (err) {
    console.log("Error:", err.message);
  }
}
test();
