import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

const data = [
  {
    type: "header",
    title: "FRANKO TRADING LIMITED",
    subtitle: "RETURN POLICY",
  },
  {
    type: "text",
    content:
      "Subject to Terms and Conditions, Franko Trading Enterprise offers returns and/or exchange or refund for items purchased within 7 DAYS OF PURCHASE. We do not accept returns and or exchange for any reason whatsoever after the stated period has elapsed.",
  },
  {
    type: "policy",
    title: "WRONG ITEM DELIVERED",
    description: [
      "The seals on the box must not be broken/opened.",
      "There should be no dents and liquid intrusion on the item.",
      "Proof of Purchase/Receipt must be provided.",
    ],
    color: "#ff4d4f",
  },
  {
    type: "policy",
    title: "MANUFACTURING DEFECTS",
    description: [
      "Within the 7 days, defective items would be replaced with the same piece/unit (depending on stock availability).",
      "All items shall go through inspection and diagnosis on return to verify the reason provided.",
      "Returns (defective items) after 7 days would be sent to the Brand’s Service Centre for repairs under the Manufacturer Warranty.",
    ],
    color: "#52c41a",
  },
  {
    type: "policy",
    title: "INCOMPLETE PACKAGE",
    description: [
      "Incomplete package or missing complementary items must be reported within 7 days for immediate redress.",
    ],
    color: "#faad14",
  },
  {
    type: "policy",
    title: "UNDELIVERED ORDER/PACKAGE",
    description: [
      "Refund/charge back request for undelivered orders will go through vetting and approval, with refunds made within 30 days.",
      "Charge back requests must be initiated through customer’s bank for payments made via credit card or other banking platforms.",
      "Refunds will be made by cheque for accounting purposes.",
    ],
    color: "#2f54eb",
  },
];

const PolicyScreen = () => {
  const renderItem = ({ item }) => {
    if (item.type === "header") {
      return (
        <View style={styles.header}>
          <Text style={styles.companyTitle}>{item.title}</Text>
          <Text style={styles.policyTitle}>{item.subtitle}</Text>
        </View>
      );
    }
    if (item.type === "text") {
      return <Text style={styles.mainText}>{item.content}</Text>;
    }
    if (item.type === "policy") {
      return (
        <View style={[styles.card, { borderColor: item.color }]}>
          <Text style={[styles.cardTitle, { color: item.color }]}>{item.title}</Text>
          {item.description.map((desc, index) => (
            <Text key={index} style={styles.cardText}>
              - {desc}
            </Text>
          ))}
        </View>
      );
    }
    return null;
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(item, index) => `${item.type}-${index}`}
      renderItem={renderItem}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f9f9f9",
  },
  header: {
    marginBottom: 16,
    alignItems: "center",
  },
  companyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "green",
  },
  policyTitle: {
    fontSize: 18,
    color: "#595959",
    marginVertical: 8,
  },
  mainText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
    marginBottom: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#555",
  },
});

export default PolicyScreen;
