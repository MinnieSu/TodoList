const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const _ = require("lodash");
const PORT = process.env.PORT || 3000;

// Require mongoose module
const mongoose = require("mongoose");
const MongoURI =
  "mongodb+srv://Minnie:szh1364minnie@atlascluster.qzhasrk.mongodb.net/?retryWrites=true&w=majority";

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Set up database connection
const connectDB = async function () {
  try {
    const connect = await mongoose.connect(MongoURI, { useNewUrlParser: true });
    console.log("MongoDB is connected!");
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

connectDB().then(() => {
  app.listen(PORT, function () {
    console.log("listening for requests!");
  });
});

// Define "item" schema and model
const itemsSchema = new mongoose.Schema({
  name: String,
});
const Item = mongoose.model("Item", itemsSchema);

// Insert default items
const item1 = new Item({
  name: "Welcome to your ToDoList ^_^/",
});
const item2 = new Item({
  name: "Hit the + button to add a new item.",
});
const item3 = new Item({
  name: "<-- Hit this to delete an item.",
});
const defaultItems = [item1, item2, item3];

// Create a list schema. Every list created contains an array of item documents.
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema],
});
const List = mongoose.model("List", listSchema);

// Insert defaultItems only when foundItems array is empty.
// Otherwise, render the listItems on the website.
app.get("/", async function (req, res) {
  try {
    let foundItems = await Item.find({});
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems)
        .then(function () {
          console.log("Successfully saved to our database! ");
        })
        .catch(function (err) {
          console.log(err);
        });
      res.redirect("/");
    } else {
      res.render("list", { listTitle: "Today", newListItems: foundItems });
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/", function (req, res) {
  // Add a new document to DB, for each item entered by user
  const itemName = req.body.newItem;
  const listTitle = req.body.list;
  const addItem = new Item({
    name: itemName,
  });

  // Check if we are making a post request to add an item from Default list "Today" or custom list
  // Add list items to the coressponding list and redirect to the list route.
  if (listTitle === "Today") {
    addItem.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listTitle })
      .then(function (foundList) {
        foundList.items.push(addItem);
        foundList.save();
        res.redirect("/" + listTitle);
      })
      .catch(function (err) {
        console.log("Failed to add new item to" + listTitle + err);
      });
  }
});

// Delete a document when it got clicked.
app.post("/delete", function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.list;
  console.log(checkedItemId);
  console.log(listName);

  // Check if we want to delete an item from Default list "Today" or Custom list.
  if (listName === "Today") {
    Item.findByIdAndRemove(checkedItemId)
      .then(() => console.log("Deleted Successfully!"))
      .catch((err) => console.log("Deletion Error: " + err));
    res.redirect("/");
  } else {
    List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: checkedItemId } } }
    )
      .then(res.redirect("/" + listName))
      .catch((err) => console.log("Deletion Error:" + err));
  }
});

// Create a dynamic route using express route paramenter
app.get("/:customListName", async function (req, res) {
  const customListName = _.capitalize(req.params.customListName);
  console.log(customListName);
  try {
    //Create a new list and render it if customListName does not exist
    const foundList = await List.findOne({ name: customListName });

    if (!foundList) {
      let newList = new List({
        name: customListName,
        items: defaultItems,
      });
      let saveNewList = await newList.save();
      res.redirect("/" + customListName);
      console.log(customListName + " is saved!");
    } else {
      res.render("list", {
        listTitle: foundList.name,
        newListItems: foundList.items,
      });
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Server error");
  }
});

app.get("/about", function (req, res) {
  res.render("about");
});
