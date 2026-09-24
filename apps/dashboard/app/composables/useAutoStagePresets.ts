import type { SeatNumber } from '@trial-booking/shared';
import { useApiClient } from '~/composables/useApiClient';
import { useBookingStore } from '~/stores/booking';

export function useAutoStagePresets() {
  const api = useApiClient();
  const bookingStore = useBookingStore();

  function pickOpenClass(minOpenSeats = 1) {
    const current = bookingStore.selectedClass;
    if (current && current.availableSeatsCount >= minOpenSeats) {
      return current;
    }
    return (
      bookingStore.classes.find((c) => c.availableSeatsCount >= minOpenSeats) ??
      bookingStore.classes[0] ??
      null
    );
  }

  function getUnconfirmedStudents(classId: string) {
    const cls = bookingStore.classes.find((c) => c.id === classId);
    const confirmedNames = new Set(
      (cls?.seats ?? []).filter((s) => s.isConfirmed).map((s) => s.confirmedStudentName)
    );
    return bookingStore.students.filter((s) => !confirmedNames.has(s.name));
  }

  async function stageRandomChild() {
    const targetClass = pickOpenClass(1);
    if (!targetClass) return;

    const openSeats = targetClass.seats.filter((s) => !s.isConfirmed);
    const candidates = getUnconfirmedStudents(targetClass.id);
    if (openSeats.length === 0 || candidates.length === 0) return;

    const randomSeat = openSeats[Math.floor(Math.random() * openSeats.length)]!;
    const randomStudent = candidates[Math.floor(Math.random() * candidates.length)]!;

    bookingStore.selectedClassId = targetClass.id;
    bookingStore.selectedParentId = randomStudent.parentId;
    bookingStore.selectedStudentId = randomStudent.id;
    bookingStore.selectedSeatNumber = randomSeat.seatNumber as SeatNumber;

    await bookingStore.submitBookingAction('hold_pending');
  }

  async function stageSameSeatRace() {
    const targetClass =
      bookingStore.classes.find(
        (c) => c.id === 'cls-math-fractions' && c.availableSeatsCount >= 1
      ) ?? pickOpenClass(1);
    if (!targetClass) return;

    const openSeat = targetClass.seats.find((s) => !s.isConfirmed);
    const candidates = getUnconfirmedStudents(targetClass.id);
    if (!openSeat || candidates.length < 2) return;

    const studentA = candidates[0]!;
    const studentB = candidates[1]!;
    const seatNumber = openSeat.seatNumber as SeatNumber;

    bookingStore.selectedClassId = targetClass.id;
    bookingStore.selectedSeatNumber = seatNumber;
    bookingStore.selectedParentId = studentB.parentId;
    bookingStore.selectedStudentId = studentB.id;

    bookingStore.isLoading = true;
    try {
      await api.api.bookings.checkout.$post({
        json: {
          parentId: studentA.parentId,
          studentId: studentA.id,
          trialClassId: targetClass.id,
          seatNumber,
        },
      });
      await api.api.bookings.checkout.$post({
        json: {
          parentId: studentB.parentId,
          studentId: studentB.id,
          trialClassId: targetClass.id,
          seatNumber,
        },
      });
      await bookingStore.fetchCatalog();
      bookingStore.lastOutcome = {
        ok: true,
        httpStatus: 201,
        errorCode: null,
        message: `Staged Same-Seat Race on Seat #${seatNumber} (${targetClass.title}): ${studentA.name} and ${studentB.name} are both in Pending Checkouts. Click "Pay All" to race!`,
        executedAt: new Date().toISOString(),
        booking: null,
      };
    } finally {
      bookingStore.isLoading = false;
    }
  }

  async function stageDuplicateChild() {
    const targetClass = pickOpenClass(2);
    if (!targetClass) return;

    const openSeats = targetClass.seats.filter((s) => !s.isConfirmed);
    const candidates = getUnconfirmedStudents(targetClass.id);
    if (openSeats.length < 2 || candidates.length === 0) return;

    const student = candidates[0]!;
    const seat1 = openSeats[0]!.seatNumber as SeatNumber;
    const seat2 = openSeats[1]!.seatNumber as SeatNumber;

    bookingStore.selectedClassId = targetClass.id;
    bookingStore.selectedParentId = student.parentId;
    bookingStore.selectedStudentId = student.id;
    bookingStore.selectedSeatNumber = seat2;

    bookingStore.isLoading = true;
    try {
      await api.api.bookings.checkout.$post({
        json: {
          parentId: student.parentId,
          studentId: student.id,
          trialClassId: targetClass.id,
          seatNumber: seat1,
        },
      });
      await api.api.bookings.checkout.$post({
        json: {
          parentId: student.parentId,
          studentId: student.id,
          trialClassId: targetClass.id,
          seatNumber: seat2,
        },
      });
      await bookingStore.fetchCatalog();
      bookingStore.lastOutcome = {
        ok: true,
        httpStatus: 201,
        errorCode: null,
        message: `Staged Duplicate Child (${student.name}) on both Seat #${seat1} and Seat #${seat2} in Pending Checkouts. Click "Pay All" to see the 2nd booking blocked with 409 DUPLICATE_CONFIRMED_BOOKING!`,
        executedAt: new Date().toISOString(),
        booking: null,
      };
    } finally {
      bookingStore.isLoading = false;
    }
  }

  async function stageOverbookCapacity() {
    const targetClass =
      bookingStore.classes.find((c) => c.id === 'cls-sci-orbit' && c.availableSeatsCount >= 1) ??
      pickOpenClass(1);
    if (!targetClass) return;

    const openSeats = targetClass.seats.filter((s) => !s.isConfirmed);
    const candidates = getUnconfirmedStudents(targetClass.id);
    if (openSeats.length === 0) return;

    const neededToExceedCapacity = targetClass.availableSeatsCount + 1;
    const selectedStudents = candidates.slice(0, Math.max(2, neededToExceedCapacity));

    bookingStore.selectedClassId = targetClass.id;
    bookingStore.isLoading = true;
    try {
      for (let i = 0; i < selectedStudents.length; i += 1) {
        const stu = selectedStudents[i]!;
        const seat = openSeats[i % openSeats.length]!.seatNumber as SeatNumber;
        await api.api.bookings.checkout.$post({
          json: {
            parentId: stu.parentId,
            studentId: stu.id,
            trialClassId: targetClass.id,
            seatNumber: seat,
          },
        });
      }
      await bookingStore.fetchCatalog();
      bookingStore.lastOutcome = {
        ok: true,
        httpStatus: 201,
        errorCode: null,
        message: `Staged Overbooking in ${targetClass.title} (${targetClass.confirmedCount}/${targetClass.maxCapacity} already confirmed + ${selectedStudents.length} added to Pending Checkouts = ${targetClass.confirmedCount + selectedStudents.length} students competing for 4 seats). Click "Pay All"!`,
        executedAt: new Date().toISOString(),
        booking: null,
      };
    } finally {
      bookingStore.isLoading = false;
    }
  }

  return {
    stageRandomChild,
    stageSameSeatRace,
    stageDuplicateChild,
    stageOverbookCapacity,
  };
}
