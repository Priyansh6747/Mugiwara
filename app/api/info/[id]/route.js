import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(request, { params }) {
  const { id } = await params;
  if (!id) return Response.json({ error: "Missing ID" }, { status: 400 });

  try {
    const snap = await adminDb.collection("AnimeData").doc(id).get();
    if (!snap.exists) {
      return Response.json({ alternatives: [] });
    }

    const data = snap.data();
    return Response.json({
      alternatives: data.alternatives || []
    });
  } catch (err) {
    console.error("[/api/info]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
