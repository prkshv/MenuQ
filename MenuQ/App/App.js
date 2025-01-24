import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
  Button,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Provider, Card, IconButton } from "react-native-paper";
import axios from "axios";
import { Picker } from "@react-native-picker/picker";
import { launchImageLibrary } from "react-native-image-picker";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
const API_URL = "http://192.168.1.38:3001"; // Replace with your correct URL

export default function App() {
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [imageUri, setImageUri] = useState(null);
  const [newItem, setNewItem] = useState({
    name: "",
    price: "",
    type: "veg",
    duration: "",
    category: "starter", // corrected spelling from "catagory"
    available: "yes",
    image: "",
  });
  const [currentScreen, setCurrentScreen] = useState("table");
  const [doneRequestTables, setDoneRequestTables] = useState([]);
  const [showForm, setShowForm] = useState(true);

  const handleImageUpload = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Camera roll permissions are required to select an image."
      );
      return;
    }

    // Open image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;

      // Convert image to binary data
      try {
        const binaryData = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Set the binary data to newItem
        setImageUri(imageUri);
        setNewItem({ ...newItem, image: binaryData });
        console.log("Selected Image (Binary) Data:", binaryData);

        // Now you can upload `binaryData` to your server
      } catch (error) {
        console.error("Error reading image as binary:", error);
      }
    }
  };
  // ***********

  useEffect(() => {
    fetchTables();
    fetchOrders();
    const interval = setInterval(fetchDoneRequest, 4000);

    return () => clearInterval(interval);
  }, []);

  const toggleAvailability = (id) => {
    const updatedItems = menuItems.map((item) =>
      item.id === id
        ? { ...item, available: item.available === "yes" ? "no" : "yes" }
        : item
    );
    setMenuItems(updatedItems);

    // Call API to update availability
    fetch(`http://192.168.1.38:3001/menuItems/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        available: updatedItems.find((item) => item.id === id).available,
      }),
    }).catch((err) => console.error("Error updating availability:", err));
  };

  const fetchDoneRequest = async () => {
    try {
      const response = await axios.get("http://192.168.1.38:3001/donerequest");
      // Assuming the response is an array of objects, each having an 'id'
      setDoneRequestTables(response.data.map((item) => item.id)); // Use 'id' instead of 'tableId'
      console.log("Done Request Tables:", response.data);
    } catch (error) {
      console.error("Error fetching done requests:", error);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchMenuItems();
    fetchOrders();

    // Refresh orders every 3 seconds
    const interval = setInterval(fetchOrders, 3000);

    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  const tableIdRef = useRef(1);

  // ==
  // Add this function to handle generating bills
  const generateBill = async (tableId) => {
    try {
      const response = await axios.get(`${API_URL}/orders`);

      const tableOrders = response.data.filter(
        (order) => order.tableId === tableId
      );

      if (tableOrders.length === 0) {
        Alert.alert("No orders", "No orders found for this table.");
        return;
      }

      // Consolidate items from all orders
      const billItems = {};
      tableOrders.forEach((order) => {
        order.items.forEach((item) => {
          if (billItems[item.id]) {
            billItems[item.id].quantity += item.quantity;
            billItems[item.id].totalPrice += item.price * item.quantity;
          } else {
            billItems[item.id] = {
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              totalPrice: item.price * item.quantity,
            };
          }
        });
      });

      // Prepare the bill payload
      const billPayload = {
        tableId,
        items: Object.values(billItems),
        total: Object.values(billItems).reduce(
          (sum, item) => sum + item.totalPrice,
          0
        ),
      };

      // Send the bill to the bills API
      await axios.post(`${API_URL}/bills`, billPayload);
      Alert.alert(
        "Bill Generated",
        "Bill for this table has been generated successfully"
      );
    } catch (error) {
      console.error("Error generating bill:", error);
      Alert.alert("Error", "Bill generation Failed");
    }
  };
  // ==

  // Fetch tables from JSON Server
  const fetchTables = async () => {
    try {
      const response = await axios.get(`${API_URL}/tables`);
      setTables(response.data);
      console.log("Tables fetched:", response.data);
    } catch (error) {
      console.error("Error fetching tables:", error);
    }
  };

  // Fetch menu items from JSON Server
  const fetchMenuItems = async () => {
    try {
      const response = await axios.get(`${API_URL}/menuItems`);
      setMenuItems(response.data);
      console.log("Menu items fetched:", response.data);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  // Fetch orders from JSON Server
  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/orders`);
      setOrders(response.data);
      console.log("Orders fetched:", response.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const renderTable = () => (
    <View style={styles.tabContent}>
      <Text style={styles.header}>Table Management</Text>
      <TouchableOpacity
        title="Add Table"
        onPress={addTable}
        style={{
          borderWidth: 1,
          borderColor: "blue",
          backgroundColor: "transparent",
          paddingVertical: 8,
          paddingHorizontal: 20,
          borderRadius: 5,
          width: "50%",
          marginLeft: "25%",
        }}
      >
        <Text style={{ color: "blue", textAlign: "center" }}>
          Add New Table
        </Text>
      </TouchableOpacity>
      <ScrollView style={{ marginTop: "10" }}>
        <View style={styles.grid}>
          {tables.map((item) => {
            const isBooked = orders.some((order) => order.tableId === item.id);
            // const isDone = doneRequestTables.includes(item.id);
            const isDone = doneRequestTables.includes(item.id.toString());

            return (
              <Card key={item.id} style={styles.card}>
                <Card.Title title={`Table: #${item.id}`} />
                <Card.Content>
                  <QRCode value={item.qrCode} size={100} />
                  <Text
                    style={{
                      color: isBooked ? "red" : "green",
                      fontWeight: "bold",
                      marginTop: 10,
                    }}
                  >
                    {/* {isBooked ? "Table is Booked" : "Table is Free"} */}
                    {isBooked ? "Table is Booked" : "Table is Available"}
                  </Text>
                </Card.Content>
                <Card.Actions style={styles.actionsRow}>
                  {isBooked && isDone && (
                    <>
                      <View style={{ marginRight: "15" }}>
                        <TouchableOpacity
                          onPress={() => generateBill(item.id)}
                          // style={styles.button}
                          style={{
                            borderWidth: 1,
                            borderColor: "blue",
                            backgroundColor: "transparent",
                            color: "#4CAF50",
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            borderRadius: 5,
                          }}
                        >
                          <Text style={{ color: "blue", textAlign: "center" }}>
                            Generate Bill
                          </Text>
                          {/* <Text style={styles.buttonText}>Generate Bill</Text> */}
                        </TouchableOpacity>
                      </View>
                      <View style={{ marginRight: "10" }}>
                        <TouchableOpacity
                          onPress={() => freeTable(item.id)}
                          // style={styles.button}
                          style={{
                            borderWidth: 1,
                            borderColor: "red",
                            backgroundColor: "transparent",
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            borderRadius: 5,
                          }}
                        >
                          {/* <Text style={styles.buttonText}>Free Table</Text> */}
                          <Text style={{ color: "red", textAlign: "center" }}>
                            Free Table
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}

                  <IconButton
                    icon="delete"
                    onPress={() => removeTable(item.id)}
                  />
                </Card.Actions>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  // Confirmation before freeing a table
  const confirmFreeTable = (tableId) => {
    Alert.alert(
      "Free Table?",
      "Are you sure you want to free this table? Do you want to delete all order data and unbook the table? ",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => freeTable(tableId) },
      ]
    );
  };

  const freeTable = async (tableId) => {
    try {
      // Find all orders associated with the table ID
      const tableOrders = orders.filter((order) => order.tableId === tableId);

      if (tableOrders.length === 0) {
        Alert.alert("No Orders", "There are no orders for this table.");
      }

      // Delete all orders associated with this table
      for (const order of tableOrders) {
        await axios.delete(`${API_URL}/orders/${order.id}`);
      }

      // Remove the bill associated with this table
      const billResponse = await axios.get(`${API_URL}/bills`);
      const billToDelete = billResponse.data.find(
        (bill) => bill.tableId === tableId
      );

      if (billToDelete) {
        await axios.delete(`${API_URL}/bills/${billToDelete.id}`);
        console.log(`Bill for Table #${tableId} has been deleted.`);
      }

      // Remove the table from the donerequest API
      await deleteRequestFromApi(tableId); // Function to remove table from donerequest

      // Refresh orders and bills after deletion
      fetchOrders();
      Alert.alert(
        "Table is Free",
        `Table #${tableId} order history is deleted, bill removed, and table has been freed.`
      );
    } catch (error) {
      console.error("Error freeing table:", error);
      Alert.alert("Error", "Failed to free the table and delete the bill.");
    }
  };

  // Function to delete table from donerequest API

  const deleteRequestFromApi = async (tableId) => {
    try {
      // Assuming the API expects the table ID as part of the URL like '/donerequest/:id'
      await axios.delete(`http://192.168.1.38:3001/donerequest/${tableId}`);
      console.log(`Table ID ${tableId} removed from donerequest API`);
    } catch (error) {
      console.error("Error deleting table from donerequest API:", error);
    }
  };

  // Function to add a new table
  const addTable = async () => {
    const newTable = {
      id: `${tableIdRef.current}`,
      qrCode: `192.168.1.38:3000/table/${tableIdRef.current}`,
    };
    try {
      await axios.post(`${API_URL}/tables`, newTable);
      setTables([...tables, newTable]);
      tableIdRef.current++;
    } catch (error) {
      console.error("Error adding table:", error);
    }
  };

  // Function to remove a table
  const removeTable = async (id) => {
    try {
      const tableExists = tables.find((table) => table.id === id);
      if (!tableExists) {
        console.error(`Table with ID ${id} does not exist.`);
        return;
      }
      await axios.delete(`${API_URL}/tables/${id}`);
      setTables(tables.filter((table) => table.id !== id));
      console.log(`Table with ID ${id} removed successfully.`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.error(`Table with ID ${id} not found on the server.`);
      } else {
        console.error("Error removing table:", error);
      }
    }
  };

  const addMenuItem = async () => {
    // Check if required fields are filled
    if (!newItem.name || !newItem.price) return;

    try {
      const response = await axios.post(`${API_URL}/menuItems`, newItem);
      setMenuItems([...menuItems, response.data]);
      // Reset all fields in newItem
      setImageUri(null);
      setNewItem({
        name: "",
        price: "",
        type: "veg",
        // duration: "",
        category: "starter",
        available: "yes",
        image: "",
      });
    } catch (error) {
      console.error("Error adding menu item:", error);
    }
  };

  // Function to remove a menu item
  const removeMenuItem = async (id) => {
    try {
      await axios.delete(`${API_URL}/menuItems/${id}`);
      setMenuItems(menuItems.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error removing menu item:", error);
    }
  };

  // Function to update item status
  const updateItemStatus = async (orderId, itemId) => {
    try {
      const order = orders.find((order) => order.id === orderId);
      const item = order.items.find((item) => item.id === itemId);
      const statusCycle = ["Preparing", "Delivered"];
      const currentIndex = statusCycle.indexOf(item.itemStatus);
      item.itemStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
      await axios.put(`${API_URL}/orders/${orderId}`, order);
      fetchOrders();
    } catch (error) {
      console.error("Error updating item status:", error);
    }
  };

  // Function to update order status
  const updateOrderStatus = async (orderId) => {
    try {
      const order = orders.find((order) => order.id === orderId);
      const statusCycle = ["Placed", "Delivered"];
      const currentIndex = statusCycle.indexOf(order.orderStatus);
      order.orderStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
      await axios.put(`${API_URL}/orders/${orderId}`, order);
      fetchOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  // Render menu management screen
  const renderMenu = () => (
    <View style={styles.tabContent}>
      <Text style={styles.header}>Menu Management</Text>
      {/* Menu List Section */}
      <ScrollView>
        {/* Show/Hide Form Button */}
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          style={{
            borderWidth: 1,
            borderColor: "blue",
            backgroundColor: "transparent",
            paddingVertical: 10,
            paddingHorizontal: 20,
            borderRadius: 5,
            width: "50%",
            marginLeft: "25%",
            marginBottom: 15,
          }}
        >
          <Text style={{ color: "blue", textAlign: "center" }}>
            {showForm ? "Hide Form" : "Show Form"}
          </Text>
        </TouchableOpacity>

        {/* Form Section */}
        {showForm && (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={newItem.name}
              onChangeText={(text) => setNewItem({ ...newItem, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Price"
              value={newItem.price}
              onChangeText={(text) => setNewItem({ ...newItem, price: text })}
              keyboardType="numeric"
            />
            <View style={{ marginBottom: "10" }}>
              <Button title="Select Image" onPress={handleImageUpload} />
              {imageUri && (
                <Image
                  source={{ uri: imageUri }}
                  style={{ width: 100, height: 100, marginTop: 20 }}
                />
              )}
            </View>
            <View
              style={{
                borderWidth: 1,
                borderColor: "lightgray",
                borderStyle: "solid",
                borderRadius: 5,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <Text style={styles.label}>Type:</Text>
              <Picker
                selectedValue={newItem.type}
                onValueChange={(value) =>
                  setNewItem({ ...newItem, type: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="Veg" value="veg" />
                <Picker.Item label="Non-Veg" value="non-veg" />
              </Picker>
            </View>
            <View
              style={{
                borderWidth: 1,
                borderColor: "lightgray",
                borderStyle: "solid",
                borderRadius: 5,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <Text style={styles.label}>Category:</Text>
              <Picker
                selectedValue={newItem.category}
                onValueChange={(value) =>
                  setNewItem({ ...newItem, category: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="Starter" value="starter" />
                <Picker.Item label="Main Course" value="main-course" />
                <Picker.Item label="Dessert" value="dessert" />
                <Picker.Item label="Drinks" value="drinks" />
              </Picker>
            </View>
            <View
              style={{
                borderWidth: 1,
                borderColor: "lightgray",
                borderStyle: "solid",
                borderRadius: 5,
                padding: 10,
              }}
            >
              <Text style={styles.label}>Available:</Text>
              <Picker
                selectedValue={newItem.available}
                onValueChange={(value) =>
                  setNewItem({ ...newItem, available: value })
                }
                style={styles.picker}
              >
                <Picker.Item label="Yes" value="yes" />
                <Picker.Item label="No" value="no" />
              </Picker>
            </View>

            <TouchableOpacity
              title="Add Menu Item"
              onPress={addMenuItem}
              style={{
                borderWidth: 1,
                borderColor: "blue",
                backgroundColor: "transparent",
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 5,
                width: "50%",
                marginLeft: "25%",
                marginTop: 20,
              }}
            >
              <Text style={{ color: "blue", textAlign: "center" }}>
                Add Menu Item
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Menu List Section */}
        <ScrollView style={{ marginTop: 5 }}>
          {menuItems.map((item) => (
            <Card key={item.id} style={styles.card}>
              <View
                style={{
                  flexDirection: "row", // Arrange items horizontally
                  alignItems: "center", // Align items vertically in the center
                  backgroundColor: "#fff", // Card background color
                  padding: 10, // Add padding for spacing
                  borderRadius: 10, // Rounded corners
                  borderWidth: 1, // Optional: Add a border
                  borderColor: "#ddd", // Optional: Border color
                  margin: 5, // Add margin for spacing between cards
                }}
              >
                <Image
                  source={
                    item.image
                      ? { uri: `data:image/jpeg;base64,${item.image}` } // Use binary data (Base64) if available
                      : require("./assets/menuq.jpg") // Fallback to local image
                  }
                  style={{
                    width: 100, // Set the width of the image
                    height: 100, // Set the height of the image
                    borderRadius: 10, // Optional: Add rounded corners
                    marginRight: 10, // Add space between image and text
                  }}
                  resizeMode="cover" // Optional: Adjust how the image fits
                />

                <View style={{ flex: 1 }}>
                  {/* Flex 1 to take remaining space */}
                  <Text
                    style={{
                      fontSize: 16, // Adjust font size for title
                      fontWeight: "bold", // Make the title bold
                      marginBottom: 5, // Add space below the title
                    }}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14, // Adjust font size for details
                      color: "#555", // Optional: Text color for details
                    }}
                  >
                    ₹ {item.price} | {item.type} | {item.category}
                  </Text>
                </View>
              </View>

              <Card.Actions>
                {/* Toggle Availability Button */}
                <TouchableOpacity
                  onPress={() => toggleAvailability(item.id)}
                  style={{
                    borderWidth: 1,
                    borderColor: item.available === "yes" ? "green" : "red",
                    backgroundColor: "transparent",
                    padding: 5,
                    borderRadius: 5,
                    marginRight: 10,
                  }}
                >
                  <Text
                    style={{
                      color: item.available === "yes" ? "green" : "red",
                    }}
                  >
                    {item.available === "yes" ? "Available" : "Unavailable"}
                  </Text>
                </TouchableOpacity>

                {/* Delete Button */}
                <IconButton
                  icon="delete"
                  onPress={() => removeMenuItem(item.id)}
                />
              </Card.Actions>
            </Card>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );

  // Render order management screen
  const renderOrders = () => (
    <View style={styles.tabContent}>
      <Text style={styles.header}>Order Management</Text>
      <ScrollView>
        {orders.map((order) => (
          <Card key={order.id} style={styles.card}>
            <Card.Title title={`Table: #${order.tableId}`} />
            <Card.Content>
              {order.items.map((item) => (
                <View key={item.id} style={styles.orderItemContainer}>
                  <Text style={styles.orderItem}>
                    {`• ${item.name} (${item.quantity}) - ₹${
                      item.price * item.quantity
                    }`}
                  </Text>
                  <View style={styles.leftAlignedButton}>
                    <TouchableOpacity
                      onPress={() => updateItemStatus(order.id, item.id)}
                      style={{
                        borderWidth: 1,
                        borderColor:
                          item.itemStatus === "Preparing" ? "red" : "green",
                        backgroundColor: "transparent",
                        padding: 5,
                        borderRadius: 5,
                        marginRight: 10,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            item.itemStatus === "Preparing" ? "red" : "green",
                        }}
                      >
                        {item.itemStatus === "Preparing"
                          ? "Preparing"
                          : "Delivered"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </Card.Content>
            <Card.Actions>
              <TouchableOpacity
                onPress={() => updateOrderStatus(order.id)}
                disabled={
                  !order.items.every((item) => item.itemStatus === "Delivered")
                }
                style={{
                  borderWidth: 1,
                  borderColor: order.items.every(
                    (item) => item.itemStatus === "Delivered"
                  )
                    ? order.orderStatus === "Placed"
                      ? "red"
                      : "green"
                    : "gray", // Set gray border color when disabled
                  backgroundColor: "transparent",
                  padding: 5,
                  borderRadius: 5,
                  marginRight: 10,
                  width: 100,
                  textAlign: "center",
                  alignContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: order.items.every(
                      (item) => item.itemStatus === "Delivered"
                    )
                      ? order.orderStatus === "Placed"
                        ? "red"
                        : "green"
                      : "gray", // Set gray text color when disabled
                  }}
                >
                  {order.orderStatus === "Placed" ? "Placed" : "Delivered"}
                </Text>
              </TouchableOpacity>
            </Card.Actions>
          </Card>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Provider>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          {currentScreen === "table"
            ? renderTable()
            : currentScreen === "menu"
            ? renderMenu()
            : renderOrders()}

          <View style={styles.bottomTabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                currentScreen === "table" && styles.activeTabButton,
              ]}
              onPress={() => setCurrentScreen("table")}
            >
              <Text style={styles.tabButtonText}>Tables</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                currentScreen === "menu" && styles.activeTabButton,
              ]}
              onPress={() => setCurrentScreen("menu")}
            >
              <Text style={styles.tabButtonText}>Menu</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                currentScreen === "orders" && styles.activeTabButton,
              ]}
              onPress={() => setCurrentScreen("orders")}
            >
              <Text style={styles.tabButtonText}>Orders</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    marginTop: 40,
  },
  bottomTabContainer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: "50",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "#ddd",
  },
  activeTabButton: {
    backgroundColor: "#bbb",
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  card: {
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
  },
  tabContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 60,
  },
  orderItem: {
    fontSize: 16,
    marginBottom: 5,
  },
  orderItemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  leftAlignedButton: {
    alignItems: "flex-start",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
