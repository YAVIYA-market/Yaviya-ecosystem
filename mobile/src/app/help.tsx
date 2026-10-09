import { useState } from "react";
import { Linking, Text } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Button, Card, Choices, Field, Page, styles } from "../components/ui";
const answers: Record<string, string> = {
  Livraison:
    "Choisissez votre ville, votre commune et votre adresse dans la commande. Les frais apparaissent avant confirmation. Les livraisons sont ouvertes à Kinshasa, Lubumbashi, Kolwezi, Matadi et Boma ; les autres villes seront proposées lors de l’extension.",
  Remboursement:
    "Vous pouvez demander un retour sous 72 heures après réception. Contactez le service client avec la référence de commande, le motif et des photos si nécessaire. L’équipe examine votre demande et confirme les modalités du retour et du remboursement. Aucun remboursement automatique n’est actuellement disponible.",
  "Problème de compte":
    "Vérifiez votre e-mail ou votre numéro avec l’indicatif +243 ou +242. Si la double authentification est activée, utilisez votre application ou un code de récupération. Ne partagez jamais votre mot de passe ni vos codes avec un interlocuteur.",
  Coupon:
    "Retrouvez vos coupons dans Profil → Coupon. Les avantages dépendent des conditions affichées et de votre historique. Les coupons de cette version pilote sont démonstratifs.",
  Commander:
    "Ouvrez un produit, appuyez sur Acheter maintenant, créez votre compte acheteur ou connectez-vous, puis choisissez votre adresse. Vérifiez le récapitulatif avant de confirmer.",
  "Suivi de commande":
    "Retrouvez chaque étape dans Suivre ma commande : validation du vendeur, préparation, livraison et réception. La discussion de la commande vous permet de contacter ses participants.",
  Paiement:
    "Le paiement en espèces à la livraison est disponible. Mobile Money et carte bancaire seront proposés après activation des passerelles de paiement.",
  "Service client":
    "Notre équipe peut vous aider pour votre commande, votre compte ou une demande de retour. Envoyez la référence et une description précise via le bouton de contact ci-dessous.",
};
export default function Help() {
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const [selected, setSelected] = useState(
      topic && answers[topic] ? topic : "Livraison",
    ),
    [question, setQuestion] = useState(""),
    [resolved, setResolved] = useState<string | null>(null);
  const ask = () => {
    const text = question.toLowerCase();
    const match =
      Object.keys(answers).find((k) =>
        text.includes(k.toLowerCase().split(" ")[0]),
      ) ||
      (/retour|rembours/.test(text)
        ? "Remboursement"
        : /mot de passe|connexion/.test(text)
          ? "Problème de compte"
          : "Service client");
    setSelected(match);
    setResolved(null);
  };
  return (
    <Page title="Comment pouvons-nous vous aider ?">
      <Card>
        <Text style={styles.heading}>Chatbot YAVIYA</Text>
        <Text style={styles.text}>
          Choisissez un sujet pour obtenir une réponse immédiate.
        </Text>
        <Choices
          value={selected}
          onChange={(v) => {
            setSelected(v);
            setResolved(null);
          }}
          values={Object.keys(answers).map((k) => ({ id: k, label: k }))}
        />
        <Text style={styles.text}>{answers[selected]}</Text>
        <Field
          label="Votre question"
          value={question}
          onChangeText={setQuestion}
          multiline
        />
        <Button title="Poser ma question" onPress={ask} />
        <Text style={styles.muted}>
          Cet assistant répond aux questions fréquentes. Pour une situation
          personnelle, contactez notre équipe.
        </Text>
        <Text style={styles.heading}>Problème résolu ?</Text>
        <Choices
          value={resolved || ""}
          onChange={setResolved}
          values={[
            { id: "yes", label: "Oui" },
            { id: "no", label: "Non" },
          ]}
        />
        {resolved === "yes" && (
          <Text style={styles.text}>
            Vous pouvez poursuivre votre expérience YAVIYA.
          </Text>
        )}
        <Button
          outline
          title="Contacter le support client"
          onPress={() =>
            void Linking.openURL(
              `mailto:support@yaviya.cd?subject=${encodeURIComponent("Aide YAVIYA — " + selected)}&body=${encodeURIComponent(question)}`,
            )
          }
        />
      </Card>
      <Card>
        <Text style={styles.heading}>Pourquoi YAVIYA ?</Text>
        <Text style={styles.text}>
          Découvrez des boutiques locales dans un espace simple et accueillant.
          Comparez les produits sous plusieurs angles, gardez vos favoris et
          retrouvez vos vendeurs suivis. Avant de confirmer, votre adresse vous
          permet de connaître les frais de livraison. Après commande, le suivi
          et la discussion réunissent les participants autour du même achat.
          Votre avis après réception aide les autres clients à choisir. Les
          dossiers des vendeurs sont examinés pour accompagner une communauté de
          commerce plus fiable.
        </Text>
        <Button
          outline
          title="Devenir partenaire YAVIYA"
          onPress={() => void Linking.openURL("mailto:partenariat@yaviya.cd")}
        />
      </Card>
    </Page>
  );
}
