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

  const selectedClassPendingCheckouts = computed(() =>
    pendingCheckouts.value
      .filter((b) => b.trialClassId === selectedClassId.value)
      .sort((a, b) => {
        const cmp = b.createdAt.localeCompare(a.createdAt);
        return cmp !== 0 ? cmp : b.id.localeCompare(a.id);
      })
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

  async function payAllPendingForSelectedClass(
    outcomesByBookingId: Record<string, 'success' | 'fail'> = {}
  ) {
    const targets = [...selectedClassPendingCheckouts.value];
    if (targets.length === 0) return null;

    isLoading.value = true;
    try {
      const results = await Promise.all(
        targets.map(async (item) => {
          const outcome = outcomesByBookingId[item.id] ?? 'success';
          const res = await api.api.bookings[':id'].pay.$post({
            param: { id: item.id },
            json: {
              paymentOutcome: outcome,
              paymentMethod: outcome === 'success' ? 'card_visa_4242' : 'card_declined_0002',
            },
          });
          const body = await res.json();
          return {
            status: res.status,
            ok: body.ok,
            errorCode: body.errorCode,
            message: body.message,
            data: body.data,
          };
        })
      );

      if (results.length === 1 && results[0]) {
        lastOutcome.value = {
          ok: results[0].ok,
          httpStatus: results[0].status,
          errorCode: results[0].errorCode,
          message: results[0].message,
          booking: results[0].data,
        };
      } else {
        const confirmedCount = results.filter((r) => r.ok).length;
        const rejectedCount = results.length - confirmedCount;
        const details = results.map((r) => r.message).join(' | ');
        lastOutcome.value = {
          ok: rejectedCount === 0,
          httpStatus: rejectedCount === 0 ? 200 : 409,
          errorCode:
            rejectedCount === 0
              ? null
              : (results.find((r) => !r.ok)?.errorCode ?? 'BATCH_PARTIAL_CONFLICT'),
          message: `Pay All (${results.length}): ${confirmedCount} confirmed, ${rejectedCount} rejected/failed. ${details}`,
          booking: results[0]?.data ?? null,
        };
      }

      await fetchCatalog();
      return lastOutcome.value;
    } finally {
      isLoading.value = false;
    }
  }

  async function cancelAllPendingForSelectedClass() {
    const targets = [...selectedClassPendingCheckouts.value];
    if (targets.length === 0) return null;

    isLoading.value = true;
    try {
      const results = await Promise.all(
        targets.map(async (item) => {
          const res = await api.api.bookings[':id'].cancel.$post({
            param: { id: item.id },
          });
          return res.json();
        })
      );

      lastOutcome.value = {
        ok: true,
        httpStatus: 200,
        errorCode: null,
        message: `Cancelled all ${results.length} pending checkout(s) for ${selectedClass.value?.title ?? 'selected class'}.`,
        booking: null,
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
    selectedClassPendingCheckouts,
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
    payAllPendingForSelectedClass,
    cancelAllPendingForSelectedClass,
    createTrialClass,
    resetStoreData,
  };
});
