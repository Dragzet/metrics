-- Пользователи добавляются через приложение (с bcrypt hash)
INSERT INTO sensors(name, location, status) VALUES ('Датчик температуры #1', 'Цех A', 'active');
INSERT INTO sensors(name, location, status) VALUES ('Датчик влажности #1', 'Склад B', 'active');
INSERT INTO sensors(name, location, status) VALUES ('Датчик давления #1', 'Линия C', 'maintenance');
INSERT INTO sensors(name, location, status) VALUES ('Датчик CO2 #1', 'Офис 1', 'active');
INSERT INTO sensors(name, location, status) VALUES ('Датчик вибрации #1', 'Станок 7', 'inactive');
INSERT INTO sensors(name, location, status) VALUES ('Датчик напряжения #1', 'Щитовая', 'active');

