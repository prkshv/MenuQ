import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useParams,
} from "react-router-dom";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaGooglePay } from "react-icons/fa";
import { SiPhonepe } from "react-icons/si";
import { FaCreditCard } from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";

const API_URL = "http://192.168.1.38:3001";

function App() {
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const response = await axios.get(`${API_URL}/menuItems`);
        setMenuItems(response.data);
      } catch (error) {
        console.error("Error fetching menu items:", error);
      }
    };
    fetchMenuItems();
  }, []);

  const fetchMenuu = async () => {
    try {
      const response = await axios.get(`${API_URL}/menuItems`);
      setMenuItems(response.data);
    } catch (error) {
      console.error("Error fetching menu items:", error);
    }
  };

  const TablePage = () => {
    const { id } = useParams();
    const [tableOrders, setTableOrders] = useState([]);
    const [statusUpdates, setStatusUpdates] = useState({});
    const [orders, setOrders] = useState([]);
    const [billPopup, setBillPopup] = useState(
      JSON.parse(localStorage.getItem(`billPopup-${id}`)) || null
    );

    useEffect(() => {
      const fetchTableOrders = async () => {
        try {
          const response = await axios.get(`${API_URL}/orders?tableId=${id}`);
          setTableOrders(response.data);
        } catch (error) {
          console.error("Error fetching table orders:", error);
        }
      };
      fetchTableOrders();
    }, [id]);

    // Periodically check for updates in the orders every 5 seconds
    useEffect(() => {
      const interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API_URL}/orders?tableId=${id}`);
          const updatedOrders = response.data;

          // Remove orders that no longer exist in the API (deleted orders)
          setTableOrders((prevOrders) =>
            prevOrders.filter((order) =>
              updatedOrders.some((updatedOrder) => updatedOrder.id === order.id)
            )
          );

          const updatedStatuses = updatedOrders.reduce((acc, order) => {
            acc[order.id] = {
              orderStatus: order.orderStatus,
              itemStatuses: order.items.map((item) => ({
                id: item.id,
                itemStatus: item.itemStatus,
              })),
            };
            return acc;
          }, {});
          setStatusUpdates(updatedStatuses);
        } catch (error) {
          console.error("Error fetching status updates:", error);
        }
      }, 5000);

      return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
      const checkForBill = async () => {
        try {
          const response = await axios.get(`${API_URL}/bills`);
          const currentBill = response.data.find((bill) => bill.tableId === id);

          if (currentBill) {
            setBillPopup(currentBill);
            localStorage.setItem(
              `billPopup-${id}`,
              JSON.stringify(currentBill)
            );
          } else {
            setBillPopup(null);
            localStorage.removeItem(`billPopup-${id}`);
          }
        } catch (error) {
          console.error("Error fetching bills:", error);
        }
      };

      const interval = setInterval(checkForBill, 4000);

      return () => clearInterval(interval);
    }, [id]);

    const handleAddItem = (item) => {
      setOrders((prevOrders) => {
        const existingItem = prevOrders.find((order) => order.id === item.id);
        if (existingItem) {
          return prevOrders.map((order) =>
            order.id === item.id
              ? { ...order, quantity: order.quantity + 1 }
              : order
          );
        } else {
          return [...prevOrders, { ...item, quantity: 1 }];
        }
      });
    };

    const handleOrderSubmit = async () => {
      // const updatedOrders = orders.map((item) => ({
      //   ...item,
      //   itemStatus: "Preparing",
      // }));

      const updatedOrders = orders.map(({ image, ...item }) => ({
        ...item,
        itemStatus: "Preparing",
      }));

      const finalOrder = {
        id: Date.now().toString(),
        tableId: id,
        orderStatus: "Placed",
        items: updatedOrders,
      };

      try {
        await axios.post(`${API_URL}/orders`, finalOrder);
        alert("Order placed.");
        fetchMenuu();
        setOrders([]);
        setTableOrders((prevOrders) => [...prevOrders, finalOrder]);
      } catch (error) {
        console.error("Error placing order:", error);
      }
    };

    const handleDoneClick = async () => {
      try {
        const response = await axios.get(`${API_URL}/donerequest`);
        const doneTables = response.data || [];

        if (!doneTables.includes(id)) {
          await axios.post(`${API_URL}/donerequest`, { id });
          alert(`Table #${id} marked as done.`);
        } else {
          alert(`Table #${id} is already marked as done.`);
        }
      } catch (error) {
        console.error("Error marking table as done:", error);
        alert("Failed to mark the table as done. Please try again.");
      }
    };

    if (billPopup) {
      return (
        <div
          className="d-flex justify-content-center align-items-center position-fixed top-0 start-0 w-100 h-100 bg-light"
          style={{ zIndex: 9999 }}
        >
          <div className="p-4 rounded w-100">
            <h2 className="text-center">Bill Details</h2>
            <h4 className="text-center mb-4">Table #{id}</h4>
            <ul className="list-group">
              {billPopup.items.map((item) => (
                <li
                  key={item.name}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <span>
                    {item.name} (x{item.quantity})
                  </span>
                  <span>₹{item.totalPrice}</span>
                </li>
              ))}
            </ul>
            <h3 className="text-center mt-4">Total: ₹{billPopup.total}</h3>
            <center>
              <p className="mt-3">Make payment using</p>
            </center>
            <div className="d-flex justify-content-center mt-2">
              <button
                className="btn btn-outline-warning mx-2"
                style={{
                  border: "1px solid black",
                  color: "black",
                }}
              >
                <FaGooglePay size={40} />
              </button>
              <button
                className="btn btn-outline-info mx-2"
                style={{ border: "1px solid black", color: "black" }}
              >
                <SiPhonepe size={30} />
              </button>
              <button
                className="btn btn-outline-danger mx-2"
                style={{ border: "1px solid black", color: "black" }}
              >
                <FaCreditCard size={30} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="container my-4">
        <h1 className="text-center mb-4">Table #{id}</h1>
        <MenuList handleAddItem={handleAddItem} />
        <TemporaryOrders
          orders={orders}
          setOrders={setOrders}
          onOrderSubmit={handleOrderSubmit}
        />
        <TableOrders tableOrders={tableOrders} statusUpdates={statusUpdates} />
        <div className="text-center mt-4">
          <button
            style={{
              width: "30%", // Reduce the width
              padding: "5px 10px", // Decrease padding
              fontSize: "12px", // Make the font smaller
            }}
            className="btn btn-danger"
            onClick={handleDoneClick}
          >
            Are you Done?
          </button>

          <br></br>
          <i style={{ fontSize: "11px" }}>
            [ Press this button after you are done to notify the staff]
          </i>
        </div>
      </div>
    );
  };

  const MenuList = ({ handleAddItem, fetchMenu }) => {
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [typeFilter, setTypeFilter] = useState("All");

    // Filtered menuItems based on search, category, and type
    const filteredMenuItems = menuItems.filter((item) => {
      const matchesSearch = item.name
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesCategory =
        categoryFilter === "All" ||
        item.category.toLowerCase() === categoryFilter.toLowerCase();
      const matchesType =
        typeFilter === "All" ||
        item.type.toLowerCase() === typeFilter.toLowerCase();

      return matchesSearch && matchesCategory && matchesType;
    });

    return (
      <div className="container">
        <h2 className="mb-4">Menu Items</h2>

        <div className="mb-4 position-relative">
          <input
            type="text"
            className="form-control pe-5" // Adjust padding to make space for the icon
            placeholder="Search item"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <FaSearch
            style={{
              position: "absolute",
              top: "50%",
              right: "10px",
              transform: "translateY(-50%)",
              color: "#6c757d", // Optional: style the icon color
              pointerEvents: "none", // Prevent interactions with the icon
              cursor: "pointer",
            }}
          />
        </div>

        {/* Filters */}
        <div className="mb-4">
          <div className="row">
            <div className="col-md-4 mt-2">
              <select
                className="form-control"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="All">All Categories</option>
                <option value="Starter">Starter</option>
                <option value="Main-Course">Main Course</option>
                <option value="Dessert">Dessert</option>
                <option value="Drinks">Drinks</option>
              </select>
            </div>
            <div className="col-md-4 mt-2">
              <select
                className="form-control"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All Types</option>
                {/* <option value="All">Veg & Non-Veg</option> */}
                <option value="Veg">Veg</option>
                <option value="Non-Veg">Non-Veg</option>
              </select>
            </div>
            <div className="col-md-4 mt-2">
              <button
                className="btn btn-outline-primary w-100"
                onClick={fetchMenuu}
              >
                Refresh Menu
              </button>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        {/* <div className="row">
          {filteredMenuItems.map((item) => (
            <div
              key={item.id}
              className="col-lg-3 col-md-3 col-sm-4 col-6 mb-4"
            >
              <div
                className={`card h-100 ${
                  item.available !== "yes" ? "disabled" : ""
                }`}
                style={
                  item.available !== "yes"
                    ? { opacity: 0.5, pointerEvents: "none" }
                    : {}
                }
              >
                <div className="card-body" style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      borderTopRightRadius: "4px",
                      borderBottomLeftRadius: "4px",
                      marginTop: "-0.7px",
                      marginRight: "-1px",
                      top: "0px",
                      right: "0px",
                      width: "25px",
                      height: "25px",
                      border: "2px solid",
                      borderColor:
                        item.type === "veg"
                          ? "green"
                          : item.type === "non-veg"
                          ? "red"
                          : "transparent",
                      backgroundColor: "transparent",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "11px",
                        height: "11px",
                        borderRadius: "50%",
                        backgroundColor:
                          item.type === "veg"
                            ? "green"
                            : item.type === "non-veg"
                            ? "red"
                            : "transparent",
                      }}
                    ></div>
                  </div>

                  <h5 className="card-title">{item.name}</h5>

                  <center>
                    <img
                      src="/menuq.jpg"
                      alt="Menu Item"
                      style={{
                        height: "120px",
                        width: "120px",
                        borderRadius: "10px",
                        marginBottom: "5px",
                        marginLeft: "-6px",
                      }}
                    />
                  </center>

                  <p className="card-text">₹{item.price}</p>
                  <p style={{ marginTop: "-18px" }}>[ {item.category} ]</p>

                  <center>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleAddItem(item)}
                      disabled={item.available !== "yes"}
                    >
                      Add Item
                    </button>
                  </center>
                </div>
              </div>
            </div>
          ))}
        </div> */}
        <div className="row">
          {filteredMenuItems.map((item) => (
            <div
              key={item.id}
              className="col-lg-3 col-md-3 col-sm-4 col-6 mb-4"
            >
              <div
                className={`card h-100 ${
                  item.available !== "yes" ? "disabled" : ""
                }`}
                style={
                  item.available !== "yes"
                    ? { opacity: 0.5, pointerEvents: "none" }
                    : {}
                }
              >
                <div className="card-body" style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      borderTopRightRadius: "4px",
                      borderBottomLeftRadius: "4px",
                      marginTop: "-0.7px",
                      marginRight: "-1px",
                      top: "0px",
                      right: "0px",
                      width: "25px",
                      height: "25px",
                      border: "2px solid",
                      borderColor:
                        item.type === "veg"
                          ? "green"
                          : item.type === "non-veg"
                          ? "red"
                          : "transparent",
                      backgroundColor: "transparent",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "11px",
                        height: "11px",
                        borderRadius: "50%",
                        backgroundColor:
                          item.type === "veg"
                            ? "green"
                            : item.type === "non-veg"
                            ? "red"
                            : "transparent",
                      }}
                    ></div>
                  </div>

                  <h5 className="card-title">{item.name}</h5>

                  <center>
                    {item.image ? (
                      <img
                        src={`data:image/jpeg;base64,${item.image}`}
                        alt="Menu Item"
                        style={{
                          height: "120px",
                          width: "120px",
                          borderRadius: "10px",
                          marginBottom: "5px",
                          marginLeft: "-6px",
                        }}
                      />
                    ) : (
                      <img
                        src="/menuq.jpg"
                        alt="Menu Item"
                        style={{
                          height: "120px",
                          width: "120px",
                          borderRadius: "10px",
                          marginBottom: "5px",
                          marginLeft: "-6px",
                        }}
                      />
                    )}
                  </center>

                  <p className="card-text">₹{item.price}</p>
                  <p style={{ marginTop: "-18px" }}>[ {item.category} ]</p>

                  <center>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => handleAddItem(item)}
                      disabled={item.available !== "yes"}
                    >
                      Add Item
                    </button>
                  </center>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ===========

  // here it is the temp change

  const TemporaryOrders = ({ orders, setOrders, onOrderSubmit }) => {
    const handleRemoveItem = (item) => {
      setOrders((prevOrders) => {
        return prevOrders
          .map((order) =>
            order.id === item.id
              ? { ...order, quantity: order.quantity - 1 }
              : order
          )
          .filter((order) => order.quantity > 0);
      });
    };

    const totalAmount = orders.reduce(
      (total, order) => total + order.price * order.quantity,
      0
    );

    return (
      <div className="container mt-4">
        <h2>Pre-Order List</h2>
        <ul className="list-group">
          {orders.map((order) => (
            <li
              key={order.id}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <div>
                {order.name} ({order.quantity}) - ₹
                {order.price * order.quantity}
              </div>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => handleRemoveItem(order)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {orders.length > 0 && (
          <>
            <p className="mt-3">
              <strong>Total: ₹{totalAmount}</strong>
            </p>
            <button
              className="btn btn-outline-success mt-2"
              onClick={onOrderSubmit}
            >
              Order
            </button>
          </>
        )}
      </div>
    );
  };

  const TableOrders = ({ tableOrders, statusUpdates }) => {
    return (
      <div className="container mt-4">
        <h2>Your Orders</h2>
        {tableOrders.length === 0 ? (
          <p>No orders yet.</p>
        ) : (
          tableOrders.map((order) => {
            const totalAmount = order.items.reduce(
              (total, item) => total + item.price * item.quantity,
              0
            );

            return (
              <div key={order.id} className="card mb-3">
                <div className="card-body">
                  <h5>Table #{order.tableId}</h5>
                  <p>
                    {/* <strong>Order Status:</strong> <br></br> */}
                    <span
                      style={{
                        color:
                          (statusUpdates[order.id]?.orderStatus ||
                            order.orderStatus) === "Delivered"
                            ? "green"
                            : "red",
                      }}
                    >
                      {statusUpdates[order.id]?.orderStatus === "Delivered"
                        ? "Your order is completed."
                        : "Your order is being processed."}
                    </span>
                  </p>
                  <ul>
                    {order.items.map((item) => {
                      const currentStatus =
                        statusUpdates[order.id]?.itemStatuses.find(
                          (status) => status.id === item.id
                        )?.itemStatus || item.itemStatus;

                      // Determine the message and its color
                      let statusMessage = "";
                      let statusColor = "black";
                      if (currentStatus === "Preparing") {
                        statusMessage = `is being prepared.`;
                        statusColor = "red";
                      } else if (currentStatus === "Delivered") {
                        statusMessage = `has been delivered.`;
                        statusColor = "green";
                      }

                      return (
                        <li key={item.id}>
                          {item.name} ({item.quantity}) (₹
                          {item.price * item.quantity}){" "}
                          <span style={{ color: statusColor }}>
                            {statusMessage}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p>
                    <strong>Total: ₹{totalAmount}</strong>
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <Router>
      <Routes>
        <Route path="/table/:id" element={<TablePage />} />
      </Routes>
    </Router>
  );
}

export default App;
