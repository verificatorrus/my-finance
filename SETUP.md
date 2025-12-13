# Настройка проекта My Finance

## Созданные файлы и структура

### Backend (Hono + Cloudflare Workers)
- `worker/index.ts` - главный файл worker с настройкой Hono и маршрутами
- `worker/routes/user.ts` - API endpoints для работы с профилем пользователя
- `worker/routes/wallet.ts` - API endpoints для работы с кошельками
- `worker/routes/currency.ts` - API endpoints для конвертации валют

### Database
- `db/schema.ts` - схема базы данных (Drizzle ORM)
- `db/migrations/0000_initial.sql` - начальная миграция
- Миграции применены для dev и prod окружений ✅

### Frontend (React + TypeScript)
- `src/lib/firebase.ts` - конфигурация Firebase
- `src/lib/api.ts` - API клиент для взаимодействия с backend
- `src/contexts/AuthContext.tsx` - контекст аутентификации
- `src/components/auth/` - компоненты аутентификации:
  - `Login.tsx` - форма входа
  - `SignUp.tsx` - форма регистрации
  - `ForgotPassword.tsx` - восстановление пароля
- `src/components/wallets/` - компоненты управления кошельками:
  - `WalletList.tsx` - список кошельков
  - `WalletForm.tsx` - форма создания/редактирования кошелька
- `src/components/Dashboard.tsx` - главная страница приложения
- `src/App.tsx` - корневой компонент

## Настройка окружения

### 1. Создайте файл `.env` в корне проекта:

```env
VITE_FIREBASE_API_KEY=AIzaSyAPoEPGFZodcH-bWRlh8fEofoU4IT70pmo
VITE_FIREBASE_AUTH_DOMAIN=my-finace-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-finace-dev
VITE_FIREBASE_STORAGE_BUCKET=my-finace-dev.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=19560270890
VITE_FIREBASE_APP_ID=1:19560270890:web:2186280f99fd1da9020753
```

### 2. Создайте файл `.env.prod` в корне проекта:

```env
VITE_FIREBASE_API_KEY=AIzaSyDFoC72LBVbedfsTHndUvbPz5WodtZVBo0
VITE_FIREBASE_AUTH_DOMAIN=my-finace-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-finace-prod
VITE_FIREBASE_STORAGE_BUCKET=my-finace-prod.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=999086871116
VITE_FIREBASE_APP_ID=1:999086871116:web:3c96f63bf8ea9667061ae9
```

## Функциональность

### Реализованные возможности:

1. **Аутентификация (Firebase)**
   - ✅ Регистрация с отправкой письма подтверждения
   - ✅ Вход в систему
   - ✅ Восстановление пароля
   - ✅ Подтверждение email (обязательно для доступа к API)
   - ✅ Выход из системы

2. **Управление кошельками**
   - ✅ Создание кошельков разных типов:
     - Кошелек (wallet)
     - Копилка (savings)
     - Банковский счет (bank_account)
     - Крипто-кошелек (crypto_wallet)
   - ✅ Редактирование кошельков (название, тип, валюта)
   - ✅ Архивирование кошельков (только с балансом 0)
   - ✅ Восстановление из архива
   - ✅ Просмотр списка активных кошельков
   - ✅ Автоматическое обновление балансов при транзакциях

3. **Транзакции**
   - ✅ Пополнение кошельков (Income)
   - ✅ Траты из кошельков (Expense)
   - ✅ Переводы между кошельками (Transfer)
   - ✅ Категории для доходов и расходов
   - ✅ Описание транзакций
   - ✅ История всех транзакций
   - ✅ Удаление транзакций с автоматическим возвратом баланса

4. **Мультивалютность**
   - ✅ Поддержка валют: KZT, USD, EUR, BTC
   - ✅ Каждый кошелек хранится в своей валюте
   - ✅ Возможность выбора основной валюты пользователя
   - ✅ Транзакции в валюте кошелька

5. **Курсы валют**
   - ✅ Получение актуальных курсов через ExchangeRate-API (fiat) и CoinGecko (crypto)
   - ✅ Кеширование курсов (1 час)
   - ✅ Конвертация между валютами
   - ✅ API endpoints для получения курсов

## Команды для разработки

```bash
# Запуск в dev режиме
npm run dev

# Сборка проекта
npm run build

# Деплой в production
npm run deploy

# Миграции базы данных
npm run db:migrate:dev    # Применить миграции для dev
npm run db:migrate:prod   # Применить миграции для prod

# Android
npm run android:build     # Сборка Android приложения
npm run android:open      # Открыть проект в Android Studio
```

## API Endpoints

### User
- `GET /api/user/profile` - получить профиль пользователя
- `PUT /api/user/profile` - обновить профиль (defaultCurrency)

### Wallets
- `GET /api/wallets` - получить все кошельки пользователя
- `GET /api/wallets/:id` - получить конкретный кошелек
- `POST /api/wallets` - создать новый кошелек
- `PUT /api/wallets/:id` - обновить кошелек
- `DELETE /api/wallets/:id` - удалить кошелек

### Transactions
- `GET /api/transactions` - получить все транзакции пользователя
- `GET /api/transactions/wallet/:walletId` - получить транзакции по кошельку
- `POST /api/transactions/income` - создать транзакцию пополнения
- `POST /api/transactions/expense` - создать транзакцию расхода
- `POST /api/transactions/transfer` - создать перевод между кошельками
- `DELETE /api/transactions/:id` - удалить транзакцию (с возвратом баланса)

### Currency
- `GET /api/currency/rate/:from/:to` - получить курс валюты
- `GET /api/currency/convert/:from/:to/:amount` - конвертировать сумму
- `GET /api/currency/supported` - получить список поддерживаемых валют

## База данных

### Таблицы:

1. **users**
   - id (Firebase UID)
   - email
   - default_currency
   - created_at
   - updated_at

2. **wallets**
   - id
   - user_id (FK -> users.id)
   - name
   - type (wallet, savings, bank_account, crypto_wallet)
   - currency (KZT, USD, EUR, BTC)
   - balance
   - icon
   - created_at
   - updated_at

3. **currency_rates**
   - id
   - from_currency
   - to_currency
   - rate
   - updated_at

4. **transactions**
   - id
   - user_id (FK -> users.id)
   - type (income, expense, transfer)
   - from_wallet_id (FK -> wallets.id, nullable)
   - to_wallet_id (FK -> wallets.id, nullable)
   - amount
   - currency
   - category
   - description
   - date
   - created_at

## Технологии

- **Frontend**: React 19, TypeScript, Material-UI, Firebase Auth
- **Backend**: Hono, Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite), Drizzle ORM
- **Auth**: Firebase Authentication + @hono/firebase-auth
- **Currency Rates**: ExchangeRate-API (fiat currencies), CoinGecko API (crypto)
- **Mobile**: Capacitor (Android)

## Использование приложения

### Создание кошелька
1. Войдите в систему и подтвердите email
2. Нажмите "Add Wallet"
3. Заполните форму (название, тип, валюта)
4. Опционально: укажите начальный баланс (будет создана транзакция "Initial Balance")
5. **Важно**: баланс кошелька нельзя редактировать напрямую - он управляется только через транзакции

### Архивирование кошелька
1. Убедитесь, что баланс кошелька равен 0 (создайте expense транзакции для обнуления)
2. Нажмите иконку корзины на кошельке
3. Подтвердите архивирование
4. **Важно**: кошелек не удаляется, а переносится в архив. История транзакций сохраняется.

### Создание транзакции
1. Нажмите на кнопку "+" (FAB) в правом нижнем углу
2. Выберите тип транзакции:
   - **Income** - пополнение кошелька
   - **Expense** - трата из кошелька  
   - **Transfer** - перевод между кошельками (только с одинаковой валютой!)
3. Заполните детали и нажмите "Create"

### Обмен валют
**Важно**: Прямые переводы между кошельками в разной валюте **запрещены**.

Для обмена валют используйте две отдельные транзакции:
1. **Expense** из кошелька в одной валюте (например, $100 из USD кошелька)
2. **Income** в кошелек в другой валюте (например, 95€ в EUR кошелек)

Это позволяет вам самостоятельно контролировать курс обмена и комиссии.

### Просмотр истории
- История транзакций отображается на главной странице справа
- Показывается тип, категория, сумма и дата
- Можно удалить транзакцию (баланс автоматически восстановится)

## Следующие шаги

Для продолжения разработки можно добавить:
- ✅ ~~Транзакции (доходы/расходы/переводы)~~
- ✅ ~~Категории транзакций~~
- Статистика и графики по категориям
- Фильтры для транзакций (по дате, категории)
- Бюджеты и цели накоплений
- Отображение общего баланса в основной валюте
- Периодические (регулярные) платежи
- Экспорт данных в CSV/Excel
- Поиск по транзакциям
- Темная тема

