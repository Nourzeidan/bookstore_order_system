CREATE TABLE CUSTOMER (
    Username VARCHAR(50) PRIMARY KEY,
    Password VARCHAR(50) NOT NULL,
    First_Name VARCHAR(50),
    Last_Name VARCHAR(50),
    Email VARCHAR(100) UNIQUE NOT NULL,
    Phone VARCHAR(20),
    Address TEXT
);

CREATE TABLE ADMIN (
    Username VARCHAR(50) PRIMARY KEY,
    Password VARCHAR(255) NOT NULL
);

CREATE TABLE PUBLISHER (
    Publisher_ID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(100) NOT NULL,
    Address TEXT,
    Telephone VARCHAR(20)
);

CREATE TABLE AUTHOR (
    Author_ID INT PRIMARY KEY AUTO_INCREMENT,
    Author_Name VARCHAR(100) NOT NULL
);


CREATE TABLE BOOK (
    ISBN VARCHAR(20) PRIMARY KEY,
    Title VARCHAR(255) NOT NULL,
    Publication_Year INT,
    Selling_Price DECIMAL(10,2),
    Category VARCHAR(20),
    Quantity_In_Stock INT DEFAULT 0,
    Threshold INT DEFAULT 5,
    Publisher_ID INT,

    -- relationship between the book and publisher table 
    -- it ensures that the book must reference an existing publisher with its publisher ID
    -- according to referential integrity so that a book cannot be associated with a publisher that does not exist
    CONSTRAINT fk_book_publisher
        FOREIGN KEY (Publisher_ID)
        REFERENCES PUBLISHER(Publisher_ID),

    --checks that the category attribute of the book exists within the allowed list of categories
    CONSTRAINT chk_category
        CHECK (Category IN ('Science','Art','Religion','History','Geography'))
);

CREATE TABLE BOOK_AUTHOR (
    ISBN VARCHAR(20),
    Author_ID INT,

    PRIMARY KEY (ISBN, Author_ID),

    FOREIGN KEY (ISBN)
        REFERENCES BOOK(ISBN),

    FOREIGN KEY (Author_ID)
        REFERENCES AUTHOR(Author_ID)
);


CREATE TABLE SHOPPING_CART (
    Cart_ID INT PRIMARY KEY AUTO_INCREMENT,
    Customer_Username VARCHAR(50) UNIQUE,

    FOREIGN KEY (Customer_Username)
        REFERENCES CUSTOMER(Username)
);
CREATE TABLE CART_ITEM (
    Cart_ID INT,
    ISBN VARCHAR(20),
    Quantity INT NOT NULL,

    PRIMARY KEY (Cart_ID, ISBN),

    FOREIGN KEY (Cart_ID)
        REFERENCES SHOPPING_CART(Cart_ID)
        ON DELETE CASCADE,-- if the cart is deleted all items in it will be deleted as well

    FOREIGN KEY (ISBN)
        REFERENCES BOOK(ISBN)
);
CREATE TABLE ORDERS (
    Order_ID INT PRIMARY KEY AUTO_INCREMENT,
    Order_Date DATE NOT NULL,
    Total_Price DECIMAL(10,2),
    Status VARCHAR(20),
    Customer_Username VARCHAR(50),

    FOREIGN KEY (Customer_Username)
        REFERENCES CUSTOMER(Username)
);

CREATE TABLE ORDER_ITEM (
    Order_ID INT,
    ISBN VARCHAR(20),
    Quantity INT,
    Price DECIMAL(10,2),

    PRIMARY KEY (Order_ID, ISBN),

    FOREIGN KEY (Order_ID)
        REFERENCES ORDERS(Order_ID)
        ON DELETE CASCADE,

    FOREIGN KEY (ISBN)
        REFERENCES BOOK(ISBN)
);
CREATE TABLE REPLENISHMENT_ORDER (
    Order_ID INT PRIMARY KEY AUTO_INCREMENT,
    ISBN VARCHAR(20),
    Publisher_ID INT,
    Quantity INT,
    Order_Date DATE,
    Status VARCHAR(20),

    FOREIGN KEY (ISBN)
        REFERENCES BOOK(ISBN),

    FOREIGN KEY (Publisher_ID)
        REFERENCES PUBLISHER(Publisher_ID)
);

DELIMITER //
CREATE TRIGGER before_book_update
BEFORE UPDATE ON BOOK -- a trigger to prevent negative inventory
FOR EACH ROW
BEGIN
    IF NEW.Quantity_In_Stock < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: Inventory cannot be negative.';
    END IF;
END //
DELIMITER ;
DELIMITER //
CREATE TRIGGER after_book_update
AFTER UPDATE ON BOOK
FOR EACH ROW
BEGIN
    IF NEW.Quantity_In_Stock < NEW.Threshold THEN
        -- Check if a pending order for this book already exists to avoid duplicates
        IF NOT EXISTS (
            SELECT 1 
            FROM REPLENISHMENT_ORDER
            WHERE ISBN = NEW.ISBN AND Status = 'Pending'
        ) THEN
            INSERT INTO REPLENISHMENT_ORDER (ISBN, Publisher_ID, Quantity, Order_Date, Status)
            VALUES (NEW.ISBN, NEW.Publisher_ID, 20, CURDATE(), 'Pending');
        END IF;
    END IF;
END //
DELIMITER ;

ALTER TABLE CUSTOMER
MODIFY Password VARCHAR(255) NOT NULL;

ALTER TABLE SHOPPING_CART 
DROP FOREIGN KEY shopping_cart_ibfk_1;

ALTER TABLE SHOPPING_CART 
ADD CONSTRAINT shopping_cart_ibfk_1 
FOREIGN KEY (Customer_Username) REFERENCES CUSTOMER(Username) 
ON UPDATE CASCADE 
ON DELETE CASCADE;

ALTER TABLE orders
DROP FOREIGN KEY orders_ibfk_1;

ALTER TABLE orders
ADD CONSTRAINT orders_ibfk_1
FOREIGN KEY (Customer_Username)
REFERENCES CUSTOMER(Username)
ON UPDATE CASCADE
ON DELETE RESTRICT;
