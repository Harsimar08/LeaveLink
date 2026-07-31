from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt
import os
from werkzeug.utils import secure_filename

holidays_bp = Blueprint('holidays', __name__)

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@holidays_bp.route('/pdfs', methods=['GET'])
def list_pdfs():
    uploads_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'holidays')
    uploads_dir = os.path.abspath(uploads_dir)
    os.makedirs(uploads_dir, exist_ok=True)

    files = []
    for fname in os.listdir(uploads_dir):
        if allowed_file(fname):
            files.append({
                'filename': fname,
                'url': f"/uploads/holidays/{fname}"
            })

    return jsonify({'success': True, 'pdfs': files}), 200


@holidays_bp.route('/pdfs', methods=['POST'])
@jwt_required()
def upload_pdf():
    claims = get_jwt()
    role = claims.get('role')
    if role != 'principal':
        return jsonify({'success': False, 'message': 'Forbidden: only principal may upload'}), 403

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        uploads_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'holidays')
        uploads_dir = os.path.abspath(uploads_dir)
        os.makedirs(uploads_dir, exist_ok=True)
        file_path = os.path.join(uploads_dir, filename)
        file.save(file_path)
        return jsonify({'success': True, 'filename': filename, 'url': f"/uploads/holidays/{filename}"}), 201

    return jsonify({'success': False, 'message': 'Invalid file type'}), 400


@holidays_bp.route('/pdfs/<string:filename>', methods=['DELETE'])
@jwt_required()
def delete_pdf(filename):
    claims = get_jwt()
    role = claims.get('role')
    if role != 'principal':
        return jsonify({'success': False, 'message': 'Forbidden: only principal may delete'}), 403

    uploads_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads', 'holidays')
    uploads_dir = os.path.abspath(uploads_dir)
    file_path = os.path.join(uploads_dir, filename)

    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            return jsonify({'success': True, 'message': 'File deleted'}), 200
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    return jsonify({'success': False, 'message': 'File not found'}), 404
