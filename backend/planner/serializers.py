from rest_framework import serializers

from planner.models import Attachment, Contact, Task


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "id",
            "name",
            "company",
            "phone",
            "email",
            "telegram",
            "other",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AttachmentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)
    url = serializers.SerializerMethodField(read_only=True)
    task = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Attachment
        fields = [
            "id",
            "task",
            "file",
            "url",
            "original_name",
            "size",
            "created_at",
        ]
        read_only_fields = ["id", "original_name", "size", "created_at", "url"]

    def get_url(self, obj) -> str:
        request = self.context.get("request")
        if request is None:
            return obj.file.url
        return request.build_absolute_uri(obj.file.url)


class TaskSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "urgency",
            "due_date",
            "status",
            "contact",
            "contact_freeform",
            "attachments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "attachments", "created_at", "updated_at"]

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        contact = attrs.get("contact", getattr(instance, "contact", None))
        contact_freeform = attrs.get(
            "contact_freeform", getattr(instance, "contact_freeform", "")
        )
        if not contact and not contact_freeform:
            raise serializers.ValidationError(
                "Provide at least one of contact or contact_freeform."
            )
        request = self.context.get("request")
        if contact and request and contact.owner_id != request.user.id:
            raise serializers.ValidationError("Contact must belong to current user.")
        return attrs
