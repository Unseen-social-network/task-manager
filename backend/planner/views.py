from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from planner.filters import TaskFilter
from planner.models import Attachment, Contact, Task
from planner.permissions import IsOwner
from planner.serializers import AttachmentSerializer, ContactSerializer, TaskSerializer


class OwnerQuerySetMixin:
    def get_queryset(self):
        return self.queryset.filter(owner=self.request.user)


class ContactViewSet(OwnerQuerySetMixin, viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [IsOwner]
    queryset = Contact.objects.all()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class TaskViewSet(OwnerQuerySetMixin, viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsOwner]
    queryset = Task.objects.select_related("contact").all()
    filterset_class = TaskFilter
    search_fields = ["title", "description", "contact_freeform"]
    ordering_fields = ["due_date", "created_at", "urgency"]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=["get", "post"], url_path="attachments")
    def attachments(self, request, pk=None):
        task = self.get_object()
        if request.method == "GET":
            serializer = AttachmentSerializer(
                task.attachments.order_by("-created_at"),
                many=True,
                context={"request": request},
            )
            return Response(serializer.data)
        if "file" not in request.FILES:
            return Response(
                {"file": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST
            )
        serializer = AttachmentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        uploaded = request.FILES.get("file")
        serializer.save(
            owner=request.user,
            task=task,
            original_name=uploaded.name,
            size=uploaded.size,
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AttachmentViewSet(
    OwnerQuerySetMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AttachmentSerializer
    permission_classes = [IsOwner]
    queryset = Attachment.objects.select_related("task").all()
