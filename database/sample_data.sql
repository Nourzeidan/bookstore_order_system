INSERT INTO ADMIN (Username, Password) 
VALUES ('admin0', SHA2('admin_2005', 256));

INSERT INTO CUSTOMER VALUES
('cust1', 'hashed_pw1', 'Ali', 'Ahmed', 'ali@mail.com', '0100000001', 'Alexandria'),
('cust2', 'hashed_pw2', 'Sara', 'Hassan', 'sara@mail.com', '0100000002', 'Cairo'),
('cust3', 'hashed_pw3', 'Omar', 'Youssef', 'omar@mail.com', '0100000003', 'Giza');


INSERT INTO PUBLISHER (Name, Address, Telephone) VALUES
('Pearson', 'UK', '111111'),
('Oxford', 'UK', '222222');


INSERT INTO AUTHOR (Author_Name) VALUES
('Isaac Newton'),
('Leonardo da Vinci'),
('Ibn Khaldun');

INSERT INTO BOOK VALUES
('ISBN1', 'Principia Mathematica', 2020, 150.00, 'Science', 10, 5, 1),
('ISBN2', 'The Vitruvian Man', 2018, 120.00, 'Art', 8, 4, 2),
('ISBN3', 'The Muqaddimah', 2019, 90.00, 'History', 3, 5, 1);

INSERT INTO BOOK_AUTHOR VALUES
('ISBN1', 1),
('ISBN2', 2),
('ISBN3', 3),
('ISBN3', 1);


INSERT INTO SHOPPING_CART (Customer_Username) VALUES
('cust1'),
('cust2');

INSERT INTO CART_ITEM VALUES
(1, 'ISBN1', 1),
(1, 'ISBN2', 2),
(2, 'ISBN3', 1);


INSERT INTO ORDERS VALUES
(1, '2025-02-15', 390.00, 'Completed', 'cust1'),
(2, '2025-03-10', 90.00, 'Completed', 'cust2');

INSERT INTO ORDER_ITEM VALUES
(1, 'ISBN1', 1, 150.00),
(1, 'ISBN2', 2, 120.00),
(2, 'ISBN3', 1, 90.00);

INSERT INTO REPLENISHMENT_ORDER VALUES
(1, 'ISBN3', 1, 20, '2025-03-01', 'Confirmed');

INSERT INTO ORDER_ITEM VALUES
(1, 'ISBN1', 8, 150.00),
(1, 'ISBN3', 5, 120.00);