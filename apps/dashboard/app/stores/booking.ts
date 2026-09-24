import { defineStore } from 'pinia';
import type {
  ClassCatalogItem,
  CreateTrialClassInput,
  EnrichedBooking,
  Parent,
  SeatNumber,
  Student,
} from '@trial-booking/shared';
import { useApiClient } from '~/composables/useApiClient';

export interface OutcomeNotice {
  ok: boolean;
  httpStatus: number;
  errorCode: string | null;
  message: string;
  booking: EnrichedBooking | null;
}

export const useBookingStore = defineStore('booking', () => {
  const api = useApiClient();

  const parents = ref<Parent[]>([]);
  const students = ref<Student[]>([]);
  const classes = ref<ClassCatalogItem[]>([]);
  const pendingCheckouts = ref<EnrichedBooking[]>([]);
  const isLoading = ref(false);
  const lastOutcome = ref<OutcomeNotice | null>(null);

  const selectedParentId = ref<string>('par-budi');
  const selectedStudentId = ref<string>('stu-dina');
  const selectedClassId = ref<string>('cls-math-fractions');
  const selectedSeatNumber = ref<SeatNumber>(4);

  const filteredStudents = computed(() =>
    students.value.filter((s) => s.parentId === selectedParentId.value)
  );

  const selectedClass = computed(
    () => classes.value.find((c) => c.id === selectedClassId.value) ?? null
  );

  watch(selectedParentId, (newParentId) => {
    const children = students.value.filter((s) => s.parentId === newParentId);
    if (children.length > 0 && !children.some((c) => c.id === selectedStudentId.value)) {
      selectedStudentId.value = children[0]!.id;
    }
  });

  watch(selectedClassId, (newClassId) => {
    const cls = classes.value.find((c) => c.id === newClassId);
    if (!cls) return;
    const currentSeat = cls.seats.find((s) => s.seatNumber === selectedSeatNumber.value);
    if (!currentSeat || currentSeat.isConfirmed) {
      const firstOpen = cls.seats.find((s) => !s.isConfirmed);
      if (firstOpen) {
        selectedSeatNumber.value = firstOpen.seatNumber;
      }
    }
  });

  async function fetchCatalog() {
    isLoading.value = true;
    try {
      const res = await api.api.catalog.$get();
      const body = await res.json();
      if (body.ok) {
        parents.value = body.data.parents;
        students.value = body.data.students;
        classes.value = body.data.classes;
        pendingCheckouts.value = body.data.pendingCheckouts;
      }
    } finally {
      isLoading.value = false;
    }
  }

  async function submitBookingAction(action: 'pay_success' | 'pay_fail' | 'hold_pending') {
    isLoading.value = true;
    try {
      const res = await api.api.bookings.submit.$post({
        json: {
          parentId: selectedParentId.value,
          studentId: selectedStudentId.value,
          trialClassId: selectedClassId.value,
          seatNumber: selectedSeatNumber.value,
          action,
        },
      });
      const body = await res.json();
      lastOutcome.value = {
        ok: body.ok,
        httpStatus: res.status,
        errorCode: body.errorCode,
        message: body.message,
        booking: body.data,
      };
      await fetchCatalog();
      return lastOutcome.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function completePendingPayment(
    bookingId: string,
    paymentOutcome: 'success' | 'fail' = 'success'
  ) {
    isLoading.value = true;
    try {
      const res = await api.api.bookings[':id'].pay.$post({
        param: { id: bookingId },
        json: {
          paymentOutcome,
          paymentMethod: paymentOutcome === 'success' ? 'card_visa_4242' : 'card_declined_0002',
        },
      });
      const body = await res.json();
      lastOutcome.value = {
        ok: body.ok,
        httpStatus: res.status,
        errorCode: body.errorCode,
        message: body.message,
        booking: body.data,
      };
      await fetchCatalog();
      return lastOutcome.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function cancelPendingBooking(bookingId: string) {
    isLoading.value = true;
    try {
      const res = await api.api.bookings[':id'].cancel.$post({
        param: { id: bookingId },
      });
      const body = await res.json();
      lastOutcome.value = {
        ok: body.ok,
        httpStatus: res.status,
        errorCode: body.errorCode,
        message: body.message,
        booking: body.data,
      };
      await fetchCatalog();
      return lastOutcome.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function createTrialClass(input: CreateTrialClassInput) {
    isLoading.value = true;
    try {
      const res = await api.api.classes.$post({
        json: input,
      });
      const body = await res.json();
      await fetchCatalog();
      return body;
    } finally {
      isLoading.value = false;
    }
  }

  async function resetStoreData() {
    isLoading.value = true;
    try {
      await api.api.reset.$post();
      lastOutcome.value = null;
      selectedParentId.value = 'par-budi';
      selectedStudentId.value = 'stu-dina';
      selectedClassId.value = 'cls-math-fractions';
      selectedSeatNumber.value = 4;
      await fetchCatalog();
    } finally {
      isLoading.value = false;
    }
  }

  return {
    parents,
    students,
    classes,
    pendingCheckouts,
    isLoading,
    lastOutcome,
    selectedParentId,
    selectedStudentId,
    selectedClassId,
    selectedSeatNumber,
    filteredStudents,
    selectedClass,
    fetchCatalog,
    submitBookingAction,
    completePendingPayment,
    cancelPendingBooking,
    createTrialClass,
    resetStoreData,
  };
});
