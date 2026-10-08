import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { api } from "../lib/api";
import { appendPhoto, choosePhotos } from "../lib/photos";
import type { Order, Role } from "../lib/types";
import { Button, Card, Choices, ErrorText, Field, styles, money } from "./ui";
type Message = {
  id: string;
  senderName: string;
  senderRole: string;
  message: string;
};
export function OrderCard({
  order: o,
  role,
  sellerIds,
  refresh,
}: {
  order: Order;
  role: Role;
  sellerIds: number[];
  refresh: () => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [cash, setCash] = useState(false),
    [chat, setChat] = useState(false),
    [messages, setMessages] = useState<Message[]>([]),
    [message, setMessage] = useState(""),
    [comment, setComment] = useState(""),
    [scores, setScores] = useState<Record<string, number>>({}),
    [courierScore, setCourierScore] = useState(0),
    [expenses, setExpenses] = useState("0"),
    [reference, setReference] = useState("");
  const loadMessages = useCallback(
    () =>
      api<Message[]>(
        `/api/marketplace/messages?country=CD&orderId=${encodeURIComponent(o.id)}`,
      )
        .then(setMessages)
        .catch((e) => setError(e.message)),
    [o.id],
  );
  useEffect(() => {
    if (chat) void loadMessages();
  }, [chat, o.revision, loadMessages]);
  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    setError("");
    try {
      await api("/api/marketplace/orders/action?country=CD", {
        orderId: o.id,
        revision: o.revision,
        action,
        ...extra,
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const proof = async () => {
    setBusy(true);
    setError("");
    try {
      const [photo] = await choosePhotos();
      if (!photo) return;
      const form = new FormData();
      form.append("orderId", o.id);
      form.append("revision", String(o.revision));
      form.append("delivered", "true");
      form.append("cashCollected", String(cash));
      await appendPhoto(form, "photo", photo);
      await api("/api/marketplace/proof?country=CD", form);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
      await refresh();
    } finally {
      setBusy(false);
    }
  };
  const review = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/api/delivery-reviews?country=CD", {
        orderId: o.id,
        sellerScores: scores,
        courierScore: o.courierUserId ? courierScore : null,
        comment,
      });
      setError("Votre évaluation a été enregistrée.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card>
      <Text style={styles.heading}>{o.id}</Text>
      <Text style={styles.text}>
        {o.cancelled
          ? "Annulée"
          : ["Validation du vendeur", "Préparation", "En livraison", "Livrée"][
              o.step
            ] || "En cours"}
      </Text>
      <Text style={styles.muted}>
        {o.city} · {o.commune} · {o.address}
      </Text>
      {o.items.map((i) => (
        <Text key={i.id} style={styles.text}>
          {i.q} × {i.title}
        </Text>
      ))}
      <Text style={styles.price}>Total : {money(o.total)}</Text>
      <Text style={styles.text}>
        Livraison : {money(o.delivery.fee)} · {o.paymentState}
      </Text>
      {o.courierName && (
        <Text style={styles.text}>Livreur : {o.courierName}</Text>
      )}
      <ErrorText error={error} />
      {!o.cancelled && (
        <>
          {role === "seller" &&
            sellerIds
              .filter((id) => String(id) in o.sellerSteps)
              .map((id) => (
                <View key={id} style={{ gap: 10 }}>
                  {!o.sellerAccepted[id] ? (
                    <>
                      <Button
                        title="Accepter la commande"
                        disabled={busy}
                        onPress={() => run("seller_accept", { sellerId: id })}
                      />
                      <Button
                        outline
                        title="Refuser la commande"
                        disabled={busy}
                        onPress={() => run("seller_decline", { sellerId: id })}
                      />
                    </>
                  ) : o.sellerSteps[id] === 0 ? (
                    <Button
                      title="Marquer le colis prêt"
                      disabled={
                        busy || !Object.values(o.sellerAccepted).every(Boolean)
                      }
                      onPress={() => run("seller_prepare", { sellerId: id })}
                    />
                  ) : !o.requestedCourier && o.sellerSteps[id] === 1 ? (
                    <>
                      <Button
                        outline
                        title={`${cash ? "✓ " : ""}Paiement en espèces reçu`}
                        onPress={() => setCash(!cash)}
                      />
                      <Button
                        title="Confirmer la remise au client"
                        disabled={busy}
                        onPress={() =>
                          run("seller_handover", {
                            sellerId: id,
                            cashCollected: cash,
                          })
                        }
                      />
                    </>
                  ) : null}
                </View>
              ))}
          {role === "courier" && (
            <>
              <Text style={styles.heading}>Rémunération de la livraison</Text>
              <Text style={styles.text}>
                Brut : {money(o.courierEarnings)} · Frais :{" "}
                {money(o.courierExpenses)} · Net : {money(o.courierNet)}
              </Text>
              <Text style={styles.muted}>
                Règlement : {o.courierPayout.status}
              </Text>
              {o.courierStatus === "accepted" && (
                <Button
                  title="J’ai récupéré les colis"
                  disabled={
                    busy || !Object.values(o.sellerSteps).every((n) => n >= 1)
                  }
                  onPress={() => run("courier_collect")}
                />
              )}{" "}
              {o.courierStatus === "collected" && (
                <>
                  <Button
                    outline
                    title={`${cash ? "✓ " : ""}Paiement en espèces reçu`}
                    onPress={() => setCash(!cash)}
                  />
                  <Button
                    title="Confirmer la livraison avec une photo"
                    disabled={busy}
                    onPress={proof}
                  />
                </>
              )}
              <Field
                label="Frais de mission (FC)"
                value={expenses}
                onChangeText={setExpenses}
                keyboardType="numeric"
              />
              <Button
                outline
                title="Enregistrer mes frais"
                disabled={busy}
                onPress={() =>
                  run("courier_expenses", { expenses: Number(expenses) })
                }
              />
            </>
          )}
          {role === "buyer" && o.step === 3 && !o.buyerConfirmed && (
            <>
              <Button
                outline
                title={`${cash ? "✓ " : ""}J’ai payé en espèces`}
                onPress={() => setCash(!cash)}
              />
              <Button
                title="Confirmer la réception"
                disabled={busy}
                onPress={() => run("buyer_receipt", { cashPaid: cash })}
              />
            </>
          )}
          {role === "buyer" && o.buyerConfirmed && (
            <>
              <Text style={styles.heading}>Évaluez votre expérience</Text>
              {Array.from(new Set(o.items.map((i) => i.seller))).map((id) => (
                <View key={id} style={{ gap: 8 }}>
                  <Text style={styles.text}>Vendeur {id}</Text>
                  <Choices
                    value={String(scores[id] || "")}
                    onChange={(v) => setScores({ ...scores, [id]: Number(v) })}
                    values={[1, 2, 3, 4, 5].map((n) => ({
                      id: String(n),
                      label: `${n} ★`,
                    }))}
                  />
                </View>
              ))}
              {!!o.courierUserId && (
                <>
                  <Text style={styles.text}>
                    Votre livreur affecté : {o.courierName}
                  </Text>
                  <Choices
                    value={String(courierScore)}
                    onChange={(v) => setCourierScore(Number(v))}
                    values={[1, 2, 3, 4, 5].map((n) => ({
                      id: String(n),
                      label: `${n} ★`,
                    }))}
                  />
                </>
              )}
              <Field
                label="Votre avis"
                value={comment}
                onChangeText={setComment}
                multiline
              />
              <Button
                title="Envoyer mon évaluation"
                disabled={busy}
                onPress={review}
              />
            </>
          )}
          {role === "admin" && o.courierPayout.status === "due" && (
            <>
              <Field
                label="Référence du règlement manuel"
                value={reference}
                onChangeText={setReference}
              />
              <Button
                title="Enregistrer le règlement effectué"
                disabled={busy || !reference.trim()}
                onPress={() =>
                  run("courier_payout", { reference, channel: "cash" })
                }
              />
            </>
          )}
        </>
      )}
      <Button
        outline
        title={chat ? "Fermer la discussion" : "Discuter de cette commande"}
        onPress={() => setChat(!chat)}
      />
      {chat && (
        <>
          <Button
            outline
            title="Actualiser les messages"
            onPress={loadMessages}
          />
          {messages.map((m) => (
            <View
              key={m.id}
              style={{
                padding: 12,
                backgroundColor: "#faf4ee",
                borderRadius: 10,
              }}
            >
              <Text style={styles.muted}>{m.senderName || m.senderRole}</Text>
              <Text style={styles.text}>{m.message}</Text>
            </View>
          ))}
          <Field
            label="Votre message"
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <Button
            title="Envoyer"
            disabled={busy || !message.trim()}
            onPress={async () => {
              setBusy(true);
              try {
                await api("/api/marketplace/messages?country=CD", {
                  orderId: o.id,
                  view: role,
                  message,
                });
                setMessage("");
                await loadMessages();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
    </Card>
  );
}
