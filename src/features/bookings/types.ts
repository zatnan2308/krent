import type { Enums, Tables } from "@/types/database";

// ---- Алиасы строк таблиц бронирования -------------------------
export type RentalBooking = Tables<"rental_bookings">;
export type RentalGuest = Tables<"rental_guests">;
export type RentalFee = Tables<"rental_fees">;

// ---- Алиасы enum-типов ----------------------------------------
export type BookingStatus = Enums<"booking_status">;
export type BookingSource = Enums<"booking_source">;
export type BookingPaymentStatus = Enums<"booking_payment_status">;
export type RentalFeeKind = Enums<"rental_fee_kind">;
