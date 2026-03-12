import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

setGlobalOptions({ region: "asia-northeast3" });

initializeApp();

export const onRequestCreated = onDocumentCreated(
  "trips/{tripId}/requests/{requestId}",
  async (event) => {
    const data = event.data.data();
    const tripId = event.params.tripId;
    const requestId = event.params.requestId;

    const toUid = data.toUid;
    if (!toUid) {
      console.log("No toUid on request, skipping push.");
      return;
    }

    const db = getFirestore();
    const tokensSnap = await db
      .collection("users")
      .doc(toUid)
      .collection("notificationTokens")
      .get();

    const tokens = tokensSnap.docs
      .map((doc) => doc.data().token)
      .filter(Boolean);

    if (tokens.length === 0) {
      console.log("No tokens for user", toUid);
      return;
    }

    const title = data.title || "여행 동행자의 요청";
    const body = data.message || "";

    const messaging = getMessaging();
    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        tripId,
        requestId,
      },
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      console.log(
        "Sent push",
        response.successCount,
        "success,",
        response.failureCount,
        "failures",
      );
      console.log("Responses:", JSON.stringify(response.responses, null, 2));

      // 죽은 토큰 자동 정리
      const dbForCleanup = getFirestore();
      await Promise.all(
        response.responses.map((r, index) => {
          if (
            !r.success &&
            r.error &&
            r.error.code === "messaging/registration-token-not-registered"
          ) {
            const tokenToDelete = tokens[index];
            console.log("Deleting invalid token for user", toUid, tokenToDelete);
            return dbForCleanup
              .collection("users")
              .doc(toUid)
              .collection("notificationTokens")
              .doc(tokenToDelete)
              .delete();
          }
          return Promise.resolve();
        }),
      );
    } catch (err) {
      console.error("Error sending push", err);
    }
  },
);
